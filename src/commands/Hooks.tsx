/**
 * Hooks Command Component
 *
 * Implements the 'kb hooks' command for git hook execution.
 *
 * Command syntax:
 * - `kb hooks execute <hook-type>` - Execute a git hook
 * - `kb hooks install` - Install git hooks
 * - `kb hooks uninstall` - Uninstall git hooks
 *
 * @description
 * This command is called by git hooks installed in .git/hooks/ directory.
 * It orchestrates the execution of post-merge and post-checkout hooks that
 * handle artifact cascades and status updates.
 *
 * @example
 * ```bash
 * kb hooks execute post-merge    # Called by git post-merge hook
 * kb hooks execute post-checkout # Called by git post-checkout hook
 * kb hooks install               # Install git hooks
 * kb hooks uninstall             # Uninstall git hooks
 * ```
 */

import {
  HookInstaller,
  PostCheckoutOrchestrator,
  PostMergeDetector,
  PostMergeOrchestrator,
} from "@kodebase/git-ops";
import { Box, Text } from "ink";
import type { FC } from "react";
import { useEffect, useState } from "react";
import { ErrorHandler } from "../components/index.js";

export interface HooksProps {
  /** Hook subcommand: execute, install, uninstall */
  subcommand: "execute" | "install" | "uninstall";
  /** Hook type (for execute subcommand): post-merge, post-checkout, post-commit */
  hookType?: string;
  /** Enable verbose output */
  verbose?: boolean;
  /** Force installation (overwrite existing hooks) */
  force?: boolean;
}

interface ExecutionState {
  loading: boolean;
  success: boolean;
  error?: Error;
  summary?: string;
}

/**
 * Hooks Command Component
 *
 * Handles git hook operations: execute, install, and uninstall.
 */
export const Hooks: FC<HooksProps> = ({
  subcommand,
  hookType,
  verbose = false,
  force = false,
}) => {
  const [state, setState] = useState<ExecutionState>({
    loading: true,
    success: false,
  });

  useEffect(() => {
    const run = async () => {
      try {
        if (subcommand === "execute") {
          if (!hookType) {
            throw new Error("Hook type is required for execute subcommand");
          }
          await executeHook(hookType, verbose, setState);
        } else if (subcommand === "install") {
          await installHooks(force, setState);
        } else if (subcommand === "uninstall") {
          await uninstallHooks(setState);
        } else {
          throw new Error(`Unknown subcommand: ${subcommand}`);
        }
      } catch (error) {
        setState({
          loading: false,
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    };

    run();
  }, [subcommand, hookType, verbose, force]);

  if (state.loading) {
    return (
      <Box flexDirection="column">
        <Text>Executing hook...</Text>
      </Box>
    );
  }

  if (state.error) {
    return <ErrorHandler error={state.error} verbose={verbose} />;
  }

  if (state.success && state.summary) {
    return (
      <Box flexDirection="column">
        <Text>{state.summary}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text color="green">✓ Hook executed successfully</Text>
    </Box>
  );
};

/**
 * Execute a git hook
 */
async function executeHook(
  hookType: string,
  verbose: boolean,
  setState: (state: ExecutionState) => void,
): Promise<void> {
  if (hookType === "post-merge") {
    await executePostMerge(verbose, setState);
  } else if (hookType === "post-checkout") {
    await executePostCheckout(verbose, setState);
  } else if (hookType === "post-commit") {
    // post-commit is not yet implemented - just succeed silently
    setState({
      loading: false,
      success: true,
      summary: verbose ? "Post-commit hook executed (no-op)" : undefined,
    });
  } else {
    throw new Error(`Unsupported hook type: ${hookType}`);
  }
}

/**
 * Execute post-merge hook
 */
async function executePostMerge(
  verbose: boolean,
  setState: (state: ExecutionState) => void,
): Promise<void> {
  const detector = new PostMergeDetector({ gitRoot: process.cwd() });
  const orchestrator = new PostMergeOrchestrator({ gitRoot: process.cwd() });

  // Detect if this is a merge that affects artifacts
  const detection = await detector.detectMerge(0);

  if (!detection.shouldExecute) {
    setState({
      loading: false,
      success: true,
      summary: verbose ? "No artifact changes detected in merge" : undefined,
    });
    return;
  }

  if (!detection.metadata) {
    setState({
      loading: false,
      success: true,
      summary: verbose ? "No merge metadata available" : undefined,
    });
    return;
  }

  // Execute the cascade orchestration
  const result = await orchestrator.execute({
    mergeMetadata: detection.metadata,
  });

  const summary = verbose
    ? `Post-merge cascade complete:\n${result.summary}`
    : undefined;

  setState({
    loading: false,
    success: true,
    summary,
  });
}

/**
 * Execute post-checkout hook
 */
async function executePostCheckout(
  verbose: boolean,
  setState: (state: ExecutionState) => void,
): Promise<void> {
  const orchestrator = new PostCheckoutOrchestrator({ baseDir: process.cwd() });

  // Get checkout info from git arguments
  const args = process.argv.slice(3); // Skip 'kb', 'hooks', 'execute'
  const [prevRef, newRef, branchFlag] = args;

  // Validate required arguments
  if (!prevRef || !newRef || !branchFlag) {
    setState({
      loading: false,
      success: true,
      summary: verbose ? "Missing required git checkout arguments" : undefined,
    });
    return;
  }

  // Execute the orchestration (orchestrator handles detection internally)
  const result = await orchestrator.execute(
    prevRef,
    newRef,
    Number.parseInt(branchFlag, 10),
  );

  if (!result.success) {
    setState({
      loading: false,
      success: true,
      summary: verbose ? `Post-checkout: ${result.reason}` : undefined,
    });
    return;
  }

  const transitionedCount = result.artifactsTransitioned?.length || 0;
  const cascadedCount = result.parentsCascaded?.length || 0;
  const totalUpdated = transitionedCount + cascadedCount;

  const summary = verbose
    ? `Post-checkout complete: ${totalUpdated} artifacts updated (${transitionedCount} transitioned, ${cascadedCount} cascaded)`
    : undefined;

  setState({
    loading: false,
    success: true,
    summary,
  });
}

/**
 * Install git hooks
 */
async function installHooks(
  force: boolean,
  setState: (state: ExecutionState) => void,
): Promise<void> {
  const installer = new HookInstaller({
    gitRoot: process.cwd(),
    force,
    cliPath: "kb",
  });

  const result = await installer.installHooks([
    "post-merge",
    "post-checkout",
    "post-commit",
  ]);

  if (!result.success) {
    throw new Error(result.error || "Hook installation failed");
  }

  const summary = `Installed ${result.installed.length} git hooks`;

  setState({
    loading: false,
    success: true,
    summary,
  });
}

/**
 * Uninstall git hooks
 */
async function uninstallHooks(
  setState: (state: ExecutionState) => void,
): Promise<void> {
  const installer = new HookInstaller({
    gitRoot: process.cwd(),
    cliPath: "kb",
  });

  const result = await installer.uninstallHooks([
    "post-merge",
    "post-checkout",
    "post-commit",
  ]);

  if (!result.success) {
    throw new Error(result.error || "Hook uninstallation failed");
  }

  const summary = `Removed ${result.removed.length} git hooks`;

  setState({
    loading: false,
    success: true,
    summary,
  });
}
