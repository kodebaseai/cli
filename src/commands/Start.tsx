/**
 * Start Command Component
 *
 * Implements the 'kb start' command for beginning work on artifacts.
 *
 * Command syntax:
 * - `kb start <artifact-id>` - Start work on an artifact
 * - `kb start <artifact-id> --submit` - Start and create PR
 *
 * @description
 * This command automates the process of starting development work on a Kodebase artifact by:
 * 1. Validating the artifact exists and is ready to start
 * 2. Creating a feature branch with the artifact ID
 * 3. Generating AI context from artifact metadata
 * 4. Copying context to clipboard for easy pasting
 * 5. Optionally creating a PR with --submit flag
 * 6. Providing clear next steps for the development workflow
 *
 * @example
 * ```bash
 * kb start E.2.3        # Start work on issue E.2.3
 * kb start E.2.3 --submit  # Create PR after starting
 * ```
 */

import {
  ArtifactService,
  type BlockingReason,
  ReadinessService,
} from "@kodebase/artifacts";
import { loadConfig } from "@kodebase/config";
import {
  CArtifactEvent,
  type TArtifactEvent,
  type TEvent,
} from "@kodebase/core";
import { createAdapter } from "@kodebase/git-ops";
import clipboardy from "clipboardy";
import { Box, Text } from "ink";
import type { FC } from "react";
import { useEffect, useState } from "react";
import { type SimpleGit, simpleGit } from "simple-git";
import { ErrorHandler, StatusBadge } from "../components/index.js";
import { generateArtifactContext } from "../utils/index.js";

export interface StartCommandProps {
  /** Artifact ID to start work on (e.g., 'E.2.3') */
  artifactId: string;
  /** Enable verbose output and error details */
  verbose?: boolean;
  /** Submit PR after starting work */
  submit?: boolean;
}

interface StartResult {
  /** Whether the start operation completed successfully */
  success: boolean;
  /** User-facing message to display */
  message: string;
  /** Name of the created branch (on success) */
  branchName?: string;
  /** Generated context (on success) */
  context?: string;
  /** PR URL (if --submit used) */
  prUrl?: string;
  /** Error (on failure) */
  error?: Error;
  /** Blocking reasons (if artifact not ready) */
  blockingReasons?: BlockingReason[];
  /** Current state (if artifact not ready) */
  currentState?: TArtifactEvent;
}

export const Start: FC<StartCommandProps> = ({
  artifactId,
  verbose,
  submit,
}) => {
  const [result, setResult] = useState<StartResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleStartCommand = async () => {
      const git = simpleGit();

      try {
        // Step 1: Ensure we're in a git repository
        const isRepo = await git.checkIsRepo();
        if (!isRepo) {
          throw new Error(
            "Not a git repository. Please run this command from within a git repository.",
          );
        }

        // Step 2: Load artifact
        const artifactService = new ArtifactService();
        const artifact = await artifactService.getArtifact({ id: artifactId });

        // Step 3: Get current state
        const events = artifact.metadata.events || [];
        const currentState: TArtifactEvent =
          events.length > 0
            ? (events[events.length - 1]?.event as TArtifactEvent)
            : CArtifactEvent.DRAFT;

        // Step 4: Check if artifact is ready using ReadinessService
        const readinessService = new ReadinessService();
        const isReady = await readinessService.isReady(artifactId);

        if (!isReady) {
          // Get blocking reasons
          const blockingReasons =
            await readinessService.getBlockingReasons(artifactId);

          setResult({
            success: false,
            message: `Cannot start ${artifactId} - artifact is not ready`,
            blockingReasons,
            currentState,
          });
          setIsLoading(false);
          return;
        }

        // Step 5: Check if already in_progress
        if (currentState === CArtifactEvent.IN_PROGRESS) {
          // Check if we're already on the artifact branch
          const currentBranch = await git.revparse(["--abbrev-ref", "HEAD"]);
          const targetBranchName = artifactId;

          if (currentBranch.trim() === targetBranchName) {
            // Already on the correct branch and in progress
            // Generate context and continue
            const context = await generateArtifactContext(artifactId);
            await clipboardy.write(context);

            setResult({
              success: true,
              message: `Already working on ${artifactId}`,
              branchName: targetBranchName,
              context,
            });
            setIsLoading(false);
            return;
          }

          // On different branch but artifact is in progress
          throw new Error(
            `Artifact ${artifactId} is already in progress. ` +
              `Switch to branch '${targetBranchName}' or complete the current work first.`,
          );
        }

        // Step 6: Create branch
        const branchName = artifactId;
        await createBranch(git, branchName);

        // Step 7: Update artifact status to in_progress
        const event: TEvent = {
          event: CArtifactEvent.IN_PROGRESS,
          timestamp: new Date().toISOString(),
          actor: artifact.metadata.assignee || "Unknown",
          trigger: "branch_created",
        };
        await artifactService.appendEvent({
          id: artifactId,
          event,
        });

        // Step 8: Generate context
        const context = await generateArtifactContext(artifactId);

        // Step 9: Copy context to clipboard
        await clipboardy.write(context);

        // Step 10: Handle --submit flag
        if (submit) {
          const prUrl = await handleSubmit(git, artifactId, branchName);
          setResult({
            success: true,
            message: `Started work on ${artifactId} and created PR`,
            branchName,
            context,
            prUrl,
          });
        } else {
          setResult({
            success: true,
            message: `Started work on ${artifactId}`,
            branchName,
            context,
          });
        }
      } catch (error) {
        setResult({
          success: false,
          message: `Failed to start work on ${artifactId}`,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      } finally {
        setIsLoading(false);
      }
    };

    handleStartCommand();
  }, [artifactId, submit]);

  // Loading state
  if (isLoading) {
    return (
      <Box flexDirection="column">
        <Text dimColor>Starting work on {artifactId}...</Text>
      </Box>
    );
  }

  // No result (shouldn't happen)
  if (!result) {
    return (
      <ErrorHandler
        error={new Error("Unexpected error occurred")}
        verbose={verbose}
      />
    );
  }

  // Error state - not ready
  if (!result.success && result.blockingReasons) {
    return (
      <Box flexDirection="column">
        <Text color="red">✗ {result.message}</Text>
        <Text />
        {result.currentState && (
          <Box>
            <Text dimColor>Current status: </Text>
            <StatusBadge status={result.currentState} />
          </Box>
        )}
        <Text />
        <Text bold>Blocking reasons:</Text>
        {result.blockingReasons.map((reason) => (
          <Box
            key={`${reason.type}-${reason.message}`}
            flexDirection="column"
            marginLeft={2}
          >
            <Text color="yellow">• {reason.message}</Text>
            {reason.relatedArtifacts && reason.relatedArtifacts.length > 0 && (
              <Box marginLeft={2}>
                <Text dimColor>
                  Related: {reason.relatedArtifacts.join(", ")}
                </Text>
              </Box>
            )}
          </Box>
        ))}
        <Text />
        <Text dimColor>
          Fix these issues first before starting this artifact.
        </Text>
      </Box>
    );
  }

  // Error state - other errors
  if (!result.success) {
    return (
      <ErrorHandler
        error={result.error ?? new Error("Unknown error")}
        verbose={verbose}
      />
    );
  }

  // Success state
  const contextPreview = result.context
    ? result.context
        .split("\n")
        .slice(0, 10)
        .map((line) => (line.length > 80 ? `${line.slice(0, 77)}...` : line))
        .join("\n")
    : "";

  return (
    <Box flexDirection="column">
      <Text color="green">✓ {result.message}</Text>
      <Text />

      {result.branchName && (
        <>
          <Text>
            Created and switched to branch:{" "}
            <Text color="cyan">{result.branchName}</Text>
          </Text>
          <Text />
        </>
      )}

      {result.context && (
        <>
          <Text dimColor>{"─".repeat(47)}</Text>
          <Text bold>📋 Issue Context (copied to clipboard)</Text>
          <Text dimColor>{"─".repeat(47)}</Text>
          <Text />
          <Box flexDirection="column">
            <Text dimColor>{contextPreview}</Text>
            <Text dimColor>...</Text>
          </Box>
          <Text />
          <Text dimColor>{"─".repeat(47)}</Text>
          <Text color="green">✓ Full context in clipboard - paste into AI</Text>
          <Text dimColor>{"─".repeat(47)}</Text>
          <Text />
        </>
      )}

      {result.prUrl ? (
        <>
          <Text color="green">✓ PR created: {result.prUrl}</Text>
          <Text />
          <Text dimColor>Next: Review and merge the PR</Text>
        </>
      ) : (
        <>
          <Text bold>Next Steps:</Text>
          <Text dimColor>1. Paste context into AI assistant</Text>
          <Text dimColor>2. Make changes and commit your work</Text>
          <Text dimColor>
            3. Run: <Text color="cyan">kb start {artifactId} --submit</Text>
          </Text>
        </>
      )}
    </Box>
  );
};

/**
 * Create a new branch and check it out
 */
async function createBranch(git: SimpleGit, branchName: string): Promise<void> {
  // Check if branch already exists
  const branches = await git.branchLocal();

  if (branches.all.includes(branchName)) {
    // Branch exists, just checkout
    await git.checkout(branchName);
  } else {
    // Create new branch and checkout
    await git.checkoutLocalBranch(branchName);
  }
}

/**
 * Handle --submit flag: push branch and create PR
 */
async function handleSubmit(
  git: SimpleGit,
  artifactId: string,
  branchName: string,
): Promise<string> {
  // Check if there are changes to commit
  const status = await git.status();

  if (status.files.length > 0) {
    throw new Error(
      "You have uncommitted changes. Please commit your changes before submitting.",
    );
  }

  // Check if branch has commits
  try {
    await git.revparse(["--verify", branchName]);
  } catch {
    throw new Error(
      "No commits found on this branch. Please make changes and commit before submitting.",
    );
  }

  // Push branch
  await git.push("origin", branchName, ["--set-upstream"]);

  // Create PR using git-ops adapter
  const config = await loadConfig(process.cwd());
  const adapter = createAdapter(config);
  const artifactService = new ArtifactService();
  const artifact = await artifactService.getArtifact({ id: artifactId });

  const pr = await adapter.createDraftPR({
    branch: branchName,
    title: `${artifactId}: ${artifact.metadata.title}`,
    body: `## Summary\n\nWork on ${artifactId}\n\n---\n*Created by Kodebase CLI*`,
    draft: true,
    repoPath: process.cwd(),
    baseBranch: "main",
  });

  // Update artifact status to in_review
  const inReviewEvent: TEvent = {
    event: "in_review" as TArtifactEvent,
    timestamp: new Date().toISOString(),
    actor: artifact.metadata.assignee || "Unknown",
    trigger: "pr_ready",
  };
  await artifactService.appendEvent({
    id: artifactId,
    event: inReviewEvent,
  });

  return pr.url || "(PR created but URL not available)";
}
