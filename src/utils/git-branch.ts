/**
 * Git Branch Management Utilities
 *
 * Provides utilities for checking git status, creating branches,
 * and managing draft PRs for the artifact creation workflow.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { loadSettings } from "./settings.js";

const execAsync = promisify(exec);

export interface GitStatus {
  /** Current branch name */
  branch: string;
  /** Whether working directory is clean */
  isClean: boolean;
  /** Whether on main/master branch */
  isOnMainBranch: boolean;
  /** Uncommitted changes (if any) */
  changes?: string[];
}

export interface BranchCreationResult {
  /** Whether branch was created successfully */
  success: boolean;
  /** Branch name that was created */
  branchName?: string;
  /** Error message if failed */
  error?: string;
  /** Draft PR URL if created */
  prUrl?: string;
}

/**
 * Get current git status
 */
export async function getGitStatus(): Promise<GitStatus> {
  try {
    // Get current branch
    const { stdout: branch } = await execAsync(
      "git rev-parse --abbrev-ref HEAD",
    );

    // Get working directory status
    const { stdout: status } = await execAsync("git status --porcelain");
    const changes = status ? status.trim().split("\n").filter(Boolean) : [];
    const isClean = changes.length === 0;

    // Check if on main branch
    const settings = await loadSettings();
    const mainBranch = settings.gitOps?.branches?.mainBranch || "main";
    const isOnMainBranch =
      branch.trim() === mainBranch || branch.trim() === "master";

    return {
      branch: branch.trim(),
      isClean,
      isOnMainBranch,
      changes: changes.length > 0 ? changes : undefined,
    };
  } catch (_error) {
    throw new Error("Not in a git repository");
  }
}

/**
 * Validate git status for artifact creation
 *
 * @returns Error message if validation fails, undefined if OK
 */
export async function validateGitStatus(): Promise<string | undefined> {
  try {
    const status = await getGitStatus();

    console.log("[DEBUG git-branch] validateGitStatus called:", {
      currentBranch: status.branch,
      isClean: status.isClean,
      isOnMainBranch: status.isOnMainBranch,
      changes: status.changes,
    });

    // Check if already on an add/* branch (batch creation mode)
    const isOnAddBranch = status.branch.startsWith("add/");

    if (isOnAddBranch) {
      // Already on add/* branch - allow batch creation with uncommitted changes
      // This is the normal flow: Initiative created, now adding milestones/issues
      console.log("[DEBUG git-branch] On add/* branch, skipping validation");
      return undefined;
    }

    // Initial validation: must be on main branch with clean working directory
    if (!status.isClean) {
      console.log("[DEBUG git-branch] Working directory not clean");
      return `Working directory is not clean. Please commit or stash your changes:\n${status.changes
        ?.map((c) => `  ${c}`)
        .join("\n")}`;
    }

    if (!status.isOnMainBranch) {
      const settings = await loadSettings();
      const mainBranch = settings.gitOps?.branches?.mainBranch || "main";
      console.log(
        `[DEBUG git-branch] Not on main branch (expected: ${mainBranch}, actual: ${status.branch})`,
      );
      return `You must be on the ${mainBranch} branch to create artifacts. Currently on: ${status.branch}`;
    }

    console.log("[DEBUG git-branch] Validation passed");
    return undefined;
  } catch (error) {
    console.log("[DEBUG git-branch] Validation error:", error);
    return error instanceof Error
      ? error.message
      : "Failed to check git status";
  }
}

/**
 * Create a new branch for artifact creation
 */
export async function createArtifactBranch(
  artifactId: string,
): Promise<BranchCreationResult> {
  console.log(
    "[DEBUG git-branch] createArtifactBranch called with:",
    artifactId,
  );

  try {
    // Validate git status first
    console.log("[DEBUG git-branch] Validating git status...");
    const validationError = await validateGitStatus();
    if (validationError) {
      console.log("[DEBUG git-branch] Validation failed:", validationError);
      return {
        success: false,
        error: validationError,
      };
    }

    // Create branch name
    const branchName = `add/${artifactId.toLowerCase()}`;
    console.log("[DEBUG git-branch] Target branch:", branchName);

    // Check if branch already exists
    try {
      const { stdout: branches } = await execAsync("git branch --list");
      const branchExists = branches
        .split("\n")
        .some((b) => b.trim() === branchName || b.trim() === `* ${branchName}`);

      if (branchExists) {
        console.log("[DEBUG git-branch] Branch already exists, checking out");
        await execAsync(`git checkout ${branchName}`);
        console.log("[DEBUG git-branch] Checked out existing branch");
        return {
          success: true,
          branchName,
        };
      }
    } catch (error) {
      console.log(
        "[DEBUG git-branch] Error checking for existing branch:",
        error,
      );
      // Continue to try creating the branch
    }

    // Create and checkout branch
    try {
      await execAsync(`git checkout -b ${branchName}`);
      console.log("[DEBUG git-branch] Branch created successfully");
    } catch (error) {
      console.log("[DEBUG git-branch] git checkout failed:", error);
      return {
        success: false,
        error: `Failed to create branch: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }

    return {
      success: true,
      branchName,
    };
  } catch (error) {
    console.log("[DEBUG git-branch] Unexpected error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create branch",
    };
  }
}

/**
 * Create a draft PR for the artifact being added
 */
export async function createDraftPR(
  artifactId: string,
  artifactTitle: string,
  branchName: string,
): Promise<{ prUrl?: string; error?: string }> {
  try {
    // Push the branch first
    try {
      await execAsync(`git push -u origin ${branchName}`);
    } catch (error) {
      return {
        error: `Failed to push branch: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }

    // Get main branch from settings
    const settings = await loadSettings();
    const mainBranch = settings.gitOps?.branches?.mainBranch || "main";

    // Create draft PR using gh CLI
    const prTitle = `Add artifact ${artifactId}: ${artifactTitle}`;
    const prBody = `## Adding ${artifactId}

**Title:** ${artifactTitle}
**Branch:** ${branchName}

This PR adds a new artifact to the Kodebase system.

### Checklist
- [ ] Artifact created with wizard
- [ ] Hierarchy validated
- [ ] AI assistance used (if applicable)
- [ ] Tests pass

---
*Created automatically by \`kb add\` command*`;

    const { stdout: prOutput } = await execAsync(
      `gh pr create --draft --base ${mainBranch} --title "${prTitle}" --body "${prBody}"`,
    );

    // Extract PR URL from output
    const prUrl = prOutput.trim();
    return { prUrl };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to create draft PR",
    };
  }
}

/**
 * Check if gh CLI is available and authenticated
 */
export async function checkGHCLI(): Promise<boolean> {
  try {
    await execAsync("gh auth status");
    return true;
  } catch {
    return false;
  }
}
