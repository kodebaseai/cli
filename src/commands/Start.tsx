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
  const [progressMessage, setProgressMessage] = useState<string | null>(null);

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
            try {
              const clipboardy = await import("clipboardy");
              await clipboardy.default.write(context);
            } catch {
              // Clipboard may not be available in headless/CI environments
            }

            // Handle --submit flag even when already working
            if (submit) {
              const prUrl = await handleSubmit(artifactId, targetBranchName);
              setResult({
                success: true,
                message: `Already working on ${artifactId} - marked PR ready`,
                branchName: targetBranchName,
                context,
                prUrl,
              });
              setIsLoading(false);
              return;
            }

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

        // Step 8: Push branch and create draft PR immediately
        setProgressMessage("Pushing branch to remote...");
        const config = await loadConfig(process.cwd());
        const adapter = createAdapter(config);

        // Check if PR already exists (user-created)
        const existingPR = await adapter.findPRForBranch(branchName);
        let prUrl: string | undefined;

        if (existingPR) {
          // User already created a PR
          prUrl = existingPR.url ?? undefined;
        } else {
          // Auto-create draft PR
          await git.push("origin", branchName, ["--set-upstream"]);
          setProgressMessage("Creating draft PR...");
          const pr = await adapter.createDraftPR({
            branch: branchName,
            title: `${artifactId}: ${artifact.metadata.title}`,
            body: `🚧 Work in progress on ${artifactId}`,
            draft: true,
            repoPath: process.cwd(),
            baseBranch: "main",
          });
          prUrl = pr.url ?? undefined;
        }

        // Step 9: Generate context
        setProgressMessage("Generating context...");
        const context = await generateArtifactContext(artifactId);

        // Step 10: Copy context to clipboard
        try {
          const clipboardy = await import("clipboardy");
          await clipboardy.default.write(context);
        } catch {
          // Clipboard may not be available in headless/CI environments
        }

        // Step 11: Handle --submit flag
        if (submit) {
          setProgressMessage("Marking PR as ready...");
          const submitUrl = await handleSubmit(artifactId, branchName);
          setResult({
            success: true,
            message: `Started work on ${artifactId} and marked PR ready`,
            branchName,
            context,
            prUrl: submitUrl,
          });
        } else {
          setResult({
            success: true,
            message: `Started work on ${artifactId}`,
            branchName,
            context,
            prUrl,
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
        <Text dimColor>
          {progressMessage || `Starting work on ${artifactId}...`}
        </Text>
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

      {result.prUrl && (
        <>
          <Text color="green">✓ Draft PR: {result.prUrl}</Text>
          <Text />
        </>
      )}

      <Text bold>Next Steps:</Text>
      <Text dimColor>1. Paste context into AI assistant</Text>
      <Text dimColor>2. Make changes and commit your work</Text>
      <Text dimColor>
        3. Mark PR ready:{" "}
        <Text color="cyan">kb start {artifactId} --submit</Text>
      </Text>
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
 * Handle --submit flag: mark existing draft PR as ready for review
 */
async function handleSubmit(
  artifactId: string,
  branchName: string,
): Promise<string> {
  // Load adapter and artifact service
  const config = await loadConfig(process.cwd());
  const adapter = createAdapter(config);
  const artifactService = new ArtifactService();

  // Find existing PR for this branch
  const existingPR = await adapter.findPRForBranch(branchName);

  if (!existingPR) {
    throw new Error(
      `No PR found for branch '${branchName}'. This should not happen - PR should have been created on start.`,
    );
  }

  if (!existingPR.isDraft) {
    throw new Error(
      `PR #${existingPR.number} is already marked as ready: ${existingPR.url}`,
    );
  }

  // Mark PR as ready for review
  await adapter.markPRReady(existingPR.number);

  // Update artifact status to in_review
  const artifact = await artifactService.getArtifact({ id: artifactId });
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

  return existingPR.url || "(PR URL not available)";
}
