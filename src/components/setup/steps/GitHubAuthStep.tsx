/**
 * GitHub Authentication Step
 *
 * Second step of setup wizard - verifies GitHub CLI authentication:
 * - Checks if gh CLI is installed
 * - Verifies authentication status
 * - Prompts user to authenticate if needed
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { Box, Text, useInput } from "ink";
import type { FC } from "react";
import { useCallback, useEffect, useState } from "react";

const execAsync = promisify(exec);

interface GitHubAuthStepProps {
  onComplete: (authenticated: boolean) => void;
  onError: (error: Error) => void;
  skipAuth?: boolean;
  verbose?: boolean;
}

interface AuthStatus {
  checking: boolean;
  installed: boolean;
  authenticated: boolean;
  username?: string;
  error?: string;
}

/**
 * GitHub Authentication Step
 *
 * Checks for gh CLI authentication and prompts user to login if needed.
 * Required for PR automation features.
 */
export const GitHubAuthStep: FC<GitHubAuthStepProps> = ({
  onComplete,
  onError,
  skipAuth,
  verbose,
}) => {
  const [status, setStatus] = useState<AuthStatus>({
    checking: true,
    installed: false,
    authenticated: false,
  });
  const [waitingForAuth, setWaitingForAuth] = useState(false);
  const [canProceed, setCanProceed] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      // Check if gh CLI is installed
      try {
        await execAsync("gh --version");
      } catch {
        setStatus({
          checking: false,
          installed: false,
          authenticated: false,
          error: "GitHub CLI (gh) not found",
        });
        return;
      }

      // Check authentication status
      const { stdout, stderr } = await execAsync("gh auth status 2>&1");
      const output = stdout + stderr;

      // Parse output for authentication info
      // Format: "✓ Logged in to github.com account USERNAME (keyring)"
      const isAuthenticated = output.includes("Logged in to github.com");
      const usernameMatch = output.match(
        /Logged in to github\.com account (\S+)/,
      );
      const username = usernameMatch?.[1];

      setStatus({
        checking: false,
        installed: true,
        authenticated: isAuthenticated,
        username,
      });

      setCanProceed(isAuthenticated || skipAuth === true);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setStatus({
        checking: false,
        installed: true,
        authenticated: false,
        error: errorMessage,
      });
    }
  }, [skipAuth]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useInput(async (input, key) => {
    // If not authenticated and user wants to authenticate
    if (input === "y" && !status.authenticated && !waitingForAuth) {
      setWaitingForAuth(true);
      try {
        // Prompt user to run gh auth login
        // We can't run it directly as it needs interactive input
        // User must run it in their terminal
        await new Promise((resolve) => setTimeout(resolve, 2000));
        // Re-check auth status
        await checkAuth();
        setWaitingForAuth(false);
      } catch (error) {
        setWaitingForAuth(false);
        onError(
          new Error(
            `Failed to authenticate: ${error instanceof Error ? error.message : "Unknown error"}`,
          ),
        );
      }
    }

    // Skip authentication
    if (input === "n" && !status.authenticated) {
      setCanProceed(true);
    }

    // Proceed if authenticated or skipped
    if (key.return && canProceed) {
      onComplete(status.authenticated);
    }

    // Re-check authentication
    if (input === "r" && !status.checking) {
      setStatus((prev) => ({ ...prev, checking: true }));
      await checkAuth();
    }
  });

  if (status.checking) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold>Checking GitHub Authentication</Text>
        </Box>

        <Box marginBottom={1}>
          <Text>Verifying gh CLI authentication...</Text>
        </Box>
      </Box>
    );
  }

  if (waitingForAuth) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold>Authenticate with GitHub</Text>
        </Box>

        <Box marginBottom={1}>
          <Text color="yellow">Please open a new terminal and run:</Text>
        </Box>

        <Box marginLeft={2} marginBottom={1}>
          <Text color="cyan">gh auth login</Text>
        </Box>

        <Box marginBottom={1}>
          <Text>Follow the prompts to authenticate with GitHub.</Text>
        </Box>

        <Box marginTop={1}>
          <Text>
            Press{" "}
            <Text bold color="green">
              R
            </Text>{" "}
            to re-check authentication status
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text bold>GitHub Authentication</Text>
      </Box>

      {!status.installed ? (
        <>
          <Box marginBottom={1}>
            <Text color="red">✗ GitHub CLI (gh) not found</Text>
          </Box>

          <Box marginBottom={1}>
            <Text>GitHub CLI is required for PR automation features.</Text>
          </Box>

          <Box marginBottom={1}>
            <Text>Install it from: https://cli.github.com/</Text>
          </Box>

          <Box marginTop={1}>
            <Text dimColor>
              Press <Text bold>R</Text> to re-check after installation
            </Text>
          </Box>
        </>
      ) : status.authenticated ? (
        <>
          <Box marginBottom={1}>
            <Text>
              <Text color="green">✓</Text> Logged in to github.com as{" "}
              <Text bold color="cyan">
                {status.username}
              </Text>
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
        </>
      ) : (
        <>
          <Box marginBottom={1}>
            <Text color="yellow">⚠ GitHub CLI not authenticated</Text>
          </Box>

          <Box marginBottom={1}>
            <Text>We need GitHub access to create PRs automatically.</Text>
          </Box>

          <Box marginBottom={1}>
            <Text>
              Would you like to authenticate now? (
              <Text bold color="green">
                y
              </Text>
              /
              <Text bold color="red">
                n
              </Text>
              )
            </Text>
          </Box>

          {skipAuth && (
            <Box marginTop={1}>
              <Text dimColor>Authentication skipped (--skip-auth flag)</Text>
            </Box>
          )}
        </>
      )}

      {status.error && verbose && (
        <Box marginTop={1}>
          <Text dimColor>Error: {status.error}</Text>
        </Box>
      )}
    </Box>
  );
};
