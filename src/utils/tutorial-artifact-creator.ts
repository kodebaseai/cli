/**
 * Tutorial Artifact Creator
 *
 * Creates artifacts specifically for tutorial purposes within sandbox environment.
 * Uses ScaffoldingService and ArtifactService for artifact creation.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  ArtifactService,
  IdAllocationService,
  ScaffoldingService,
} from "@kodebase/artifacts";
import { CEstimationSize, CPriority, type TAnyArtifact } from "@kodebase/core";

export interface TutorialArtifactResult {
  success: boolean;
  artifact?: TAnyArtifact;
  filePath?: string;
  error?: string;
  commandResults?: string;
}

export const INITIATIVE_ID = "X";
export const INITIATIVE_SLUG = "build-my-first-app";
export const INITIATIVE_TITLE = "build-my-first-app";
export const MILESTONE_ID = `${INITIATIVE_ID}.1`;
export const MILESTONE_SLUG = "user-authentication-system";
export const MILESTONE_TITLE = "User authentication system";
export const ISSUE_ID = `${MILESTONE_ID}.1`;
export const ISSUE_SLUG = "implement-login-endpoint";
export const ISSUE_TITLE = "Implement login endpoint";

/**
 * Creates an initiative for tutorial purposes using fixed X ID
 */
export async function createTutorialInitiative(
  workingDir: string,
  title: string,
): Promise<TutorialArtifactResult> {
  try {
    const artifactsDir = join(workingDir, ".kodebase", "artifacts");

    // Use fixed X ID for tutorial
    const id = INITIATIVE_ID;
    const slug = INITIATIVE_SLUG;

    // Create services
    const idService = new IdAllocationService(artifactsDir);
    const scaffoldingService = new ScaffoldingService(idService);
    const artifactService = new ArtifactService();

    // Scaffold initiative with fixed ID
    const { artifact } = await scaffoldingService.scaffoldInitiative(title, {
      vision: `Learn kodebase by building: ${title}`,
      scopeIn: ["Tutorial project to demonstrate kodebase concepts"],
      successCriteria: [
        "Complete tutorial walkthrough",
        "Understand artifact hierarchy",
        "Practice CLI commands",
      ],
      assignee: "Tutorial User (tutorial@example.com)",
      priority: CPriority.MEDIUM,
      estimation: CEstimationSize.M,
    });

    // Create initiative directory with X ID
    const initiativeDir = join(artifactsDir, `${id}.${slug}`);
    mkdirSync(initiativeDir, { recursive: true });

    // Create artifact file
    const filePath = join(initiativeDir, `${id}.yml`);
    await artifactService.createArtifact({
      id,
      artifact,
      slug,
    });

    return {
      success: true,
      artifact,
      filePath,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Creates a milestone for tutorial purposes using X.1 ID
 */
export async function createTutorialMilestone(
  workingDir: string,
  title: string,
  parentId = INITIATIVE_ID,
): Promise<TutorialArtifactResult> {
  try {
    const artifactsDir = join(workingDir, ".kodebase", "artifacts");

    // Use fixed X.1 ID for tutorial
    const id = MILESTONE_ID;
    const slug = MILESTONE_SLUG;

    // Create services
    const idService = new IdAllocationService(artifactsDir);
    const scaffoldingService = new ScaffoldingService(idService);
    const artifactService = new ArtifactService();

    // Scaffold milestone with fixed ID
    const { artifact } = await scaffoldingService.scaffoldMilestone(
      parentId,
      title,
      {
        summary: `Tutorial milestone: ${title}`,
        deliverables: [
          "Learn milestone concepts",
          "Understand parent-child relationships",
          "Practice CLI milestone commands",
        ],
        assignee: "Tutorial User (tutorial@example.com)",
        priority: CPriority.MEDIUM,
        estimation: CEstimationSize.M,
      },
    );

    // Create milestone directory structure
    const initiativeDir = join(
      artifactsDir,
      `${INITIATIVE_ID}.${INITIATIVE_SLUG}`,
    );
    const milestoneDir = join(initiativeDir, `${id}.${slug}`);
    mkdirSync(milestoneDir, { recursive: true });

    // Create artifact file
    const filePath = join(milestoneDir, `${id}.yml`);
    await artifactService.createArtifact({
      id,
      artifact,
      slug,
    });

    return {
      success: true,
      artifact,
      filePath,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Creates an issue for tutorial purposes using X.1.1 ID
 */
export async function createTutorialIssue(
  workingDir: string,
  title: string,
  parentId = MILESTONE_ID,
): Promise<TutorialArtifactResult> {
  try {
    const artifactsDir = join(workingDir, ".kodebase", "artifacts");

    // Use fixed X.1.1 ID for tutorial
    const id = ISSUE_ID;
    const slug = ISSUE_SLUG;

    // Create services
    const idService = new IdAllocationService(artifactsDir);
    const scaffoldingService = new ScaffoldingService(idService);
    const artifactService = new ArtifactService();

    // Scaffold issue with fixed ID
    const { artifact } = await scaffoldingService.scaffoldIssue(
      parentId,
      title,
      {
        summary: `Tutorial issue: ${title}`,
        acceptanceCriteria: [
          "Understand issue concepts and structure",
          "Practice creating detailed work items",
          "Learn acceptance criteria definition",
          "Experience complete artifact hierarchy",
        ],
        assignee: "Tutorial User (tutorial@example.com)",
        priority: CPriority.MEDIUM,
        estimation: CEstimationSize.M,
      },
    );

    // Create directory structure
    const initiativeDir = join(
      artifactsDir,
      `${INITIATIVE_ID}.${INITIATIVE_SLUG}`,
    );
    const milestoneDir = join(
      initiativeDir,
      `${MILESTONE_ID}.${MILESTONE_SLUG}`,
    );
    mkdirSync(milestoneDir, { recursive: true });

    // Create artifact file
    const filePath = join(milestoneDir, `${id}.${slug}.yml`);
    await artifactService.createArtifact({
      id,
      artifact,
      slug,
    });

    return {
      success: true,
      artifact,
      filePath,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Demonstrates Git workflow integration with the X.1.1 issue
 */
export async function demonstrateGitWorkflow(
  workingDir: string,
): Promise<TutorialArtifactResult> {
  try {
    // Find the X.1.1 issue file
    const artifactsDir = join(workingDir, ".kodebase", "artifacts");
    const issueFilePath = join(
      artifactsDir,
      "X.tutorial-demo",
      "X.1.user-authentication",
      "X.1.1.implement-login.yml",
    );

    // Read current issue content and update with ready event
    const { execSync } = await import("node:child_process");

    try {
      const currentContent = readFileSync(issueFilePath, "utf8");

      // Add ready event
      const readyEvent = `  - event: ready
    timestamp: "${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}"
    actor: "Tutorial User (tutorial@example.com)"
    trigger: "tutorial_demo"`;

      // Insert after the draft event (find metadata.events section and append)
      const updatedContent = currentContent.replace(
        /(metadata:\s+events:\s+[\s\S]*?)(\s+content:)/,
        `$1${readyEvent}\n$2`,
      );

      writeFileSync(issueFilePath, updatedContent);

      // Demonstrate Git workflow commands
      const gitCommands = [
        "git status",
        "git add .",
        `git commit -m "Tutorial: Mark ${ISSUE_ID} as ready"`,
        `git branch X.1.1 2>/dev/null || git checkout -b ${ISSUE_ID}`,
        "git status",
      ];

      let commandResults = "";
      for (const command of gitCommands) {
        try {
          const result = execSync(command, {
            cwd: workingDir,
            encoding: "utf8",
            stdio: "pipe",
          });
          commandResults += `$ ${command}\n${result}\n\n`;
        } catch (_error) {
          // Some commands might fail, that's ok for demo
          commandResults += `$ ${command}\n[Demo command - would run in real workflow]\n\n`;
        }
      }

      return {
        success: true,
        filePath: issueFilePath,
        commandResults,
      };
    } catch (_fileError) {
      // If file operations fail, provide simulated demonstration
      return {
        success: true,
        filePath: workingDir,
        commandResults: "Git workflow demonstration completed (simulated)",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
