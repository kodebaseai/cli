/**
 * Hook Installation Step
 *
 * Installs git hooks using HookInstaller from @kodebase/git-ops:
 * - post-checkout: Update artifact status on branch switch
 * - post-merge: Cascade status changes on PR merge
 * - post-commit: Record commit events
 */

import type { GitHookType, InstallResult } from "@kodebase/git-ops";
import { HookInstaller } from "@kodebase/git-ops";
import { Box, Text, useInput } from "ink";
import type { FC } from "react";
import { useEffect, useState } from "react";

interface HookInstallationStepProps {
  onComplete: () => void;
  onError: (error: Error) => void;
  force?: boolean;
  verbose?: boolean;
}

interface HookStatus {
  installing: boolean;
  installed: boolean;
  result?: InstallResult;
  error?: string;
}

const HOOKS_TO_INSTALL: GitHookType[] = [
  "post-checkout",
  "post-merge",
  "post-commit",
];

/**
 * Hook Installation Step
 *
 * Uses HookInstaller from @kodebase/git-ops to install git hooks
 * that power the git-ops automation features.
 */
export const HookInstallationStep: FC<HookInstallationStepProps> = ({
  onComplete,
  onError,
  force,
  verbose,
}) => {
  const [status, setStatus] = useState<HookStatus>({
    installing: true,
    installed: false,
  });
  const [canProceed, setCanProceed] = useState(false);

  useEffect(() => {
    const installHooks = async () => {
      try {
        const installer = new HookInstaller({
          gitRoot: process.cwd(),
          force: force || false,
          cliPath: "kb", // CLI command name
        });

        const result = await installer.installHooks(HOOKS_TO_INSTALL);

        if (!result.success) {
          setStatus({
            installing: false,
            installed: false,
            error: result.error || "Hook installation failed",
          });
          onError(new Error(result.error || "Hook installation failed"));
          return;
        }

        setStatus({
          installing: false,
          installed: true,
          result,
        });

        setCanProceed(true);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setStatus({
          installing: false,
          installed: false,
          error: errorMessage,
        });
        onError(new Error(`Failed to install hooks: ${errorMessage}`));
      }
    };

    installHooks();
  }, [force, onError]);

  useInput((_, key) => {
    if (key.return && canProceed) {
      onComplete();
    }
  });

  if (status.installing) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold>Installing Git Hooks</Text>
        </Box>

        <Box marginBottom={1}>
          <Text>Installing hooks for git-ops automation...</Text>
        </Box>
      </Box>
    );
  }

  if (status.error) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="red">
            Hook Installation Error
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text color="red">✗ {status.error}</Text>
        </Box>

        <Box marginTop={1}>
          <Text dimColor>
            Try running with --force to overwrite existing hooks.
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text bold>Git Hooks Installed</Text>
      </Box>

      {status.result && (
        <>
          {/* Installed hooks */}
          {status.result.installed.length > 0 && (
            <Box marginBottom={1} flexDirection="column">
              {status.result.installed.map((hook) => (
                <Text key={hook}>
                  <Text color="green">✓</Text> {hook} hook installed
                </Text>
              ))}
            </Box>
          )}

          {/* Backed up hooks */}
          {status.result.backedUp && status.result.backedUp.length > 0 && (
            <Box marginBottom={1} flexDirection="column">
              <Text color="yellow">Backed up existing hooks:</Text>
              {status.result.backedUp.map((hook) => (
                <Text key={hook} dimColor>
                  {hook} (backup created)
                </Text>
              ))}
            </Box>
          )}

          {/* Skipped hooks */}
          {status.result.skipped && status.result.skipped.length > 0 && (
            <Box marginBottom={1} flexDirection="column">
              <Text color="yellow">⚠ Skipped (existing hooks found):</Text>
              {status.result.skipped.map((hook) => (
                <Text key={hook} dimColor>
                  {hook} (use --force to overwrite)
                </Text>
              ))}
            </Box>
          )}
        </>
      )}

      {/* Summary */}
      <Box marginBottom={1}>
        <Text dimColor>
          Hooks enable automatic artifact status updates and cascades.
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text>
          Press{" "}
          <Text bold color="green">
            Enter
          </Text>{" "}
          to continue
        </Text>
      </Box>

      {verbose && status.result && (
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>Installation details:</Text>
          <Text dimColor>- Installed: {status.result.installed.length}</Text>
          {status.result.backedUp && (
            <Text dimColor>- Backed up: {status.result.backedUp.length}</Text>
          )}
          {status.result.skipped && (
            <Text dimColor>- Skipped: {status.result.skipped.length}</Text>
          )}
        </Box>
      )}
    </Box>
  );
};
