/**
 * Environment Detection Step
 *
 * First step of setup wizard - validates the environment:
 * - Git repository exists
 * - Node.js version is compatible
 * - GitHub repository is detected (optional)
 */

import { exec } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { Box, Text, useInput } from "ink";
import type { FC } from "react";
import { useEffect, useState } from "react";

const execAsync = promisify(exec);

interface EnvironmentDetectionStepProps {
  onComplete: () => void;
  onError: (error: Error) => void;
  verbose?: boolean;
}

interface EnvironmentStatus {
  gitRepo: boolean;
  nodeVersion: string | null;
  githubRepo: string | null;
  checking: boolean;
  error?: string;
}

/**
 * Environment Detection Step
 *
 * Checks for:
 * - Git repository (required)
 * - Node.js version (required >=22.0.0)
 * - GitHub repository (optional, nice to have)
 */
export const EnvironmentDetectionStep: FC<EnvironmentDetectionStepProps> = ({
  onComplete,
  onError,
  verbose,
}) => {
  const [status, setStatus] = useState<EnvironmentStatus>({
    gitRepo: false,
    nodeVersion: null,
    githubRepo: null,
    checking: true,
  });
  const [canProceed, setCanProceed] = useState(false);

  useEffect(() => {
    const checkEnvironment = async () => {
      try {
        // Check 1: Git repository
        const gitDir = join(process.cwd(), ".git");
        const hasGit = existsSync(gitDir);

        // Check 2: Node.js version
        const nodeVersion = process.version;

        // Check 3: GitHub repository (optional)
        let githubRepo: string | null = null;
        try {
          const { stdout } = await execAsync(
            "gh repo view --json nameWithOwner -q .nameWithOwner",
          );
          githubRepo = stdout.trim();
        } catch {
          // GitHub repo detection is optional, so we don't fail here
          githubRepo = null;
        }

        setStatus({
          gitRepo: hasGit,
          nodeVersion,
          githubRepo,
          checking: false,
        });

        // Can proceed if git repo exists and Node.js version is valid
        const canContinue = hasGit && nodeVersion !== null;
        setCanProceed(canContinue);

        if (!canContinue) {
          const issues: string[] = [];
          if (!hasGit) issues.push("Git repository not found");
          if (!nodeVersion) issues.push("Node.js not detected");

          onError(
            new Error(
              `Environment check failed:\n${issues.map((i) => `  - ${i}`).join("\n")}\n\nPlease run 'kb setup' from a git repository with Node.js >=22.0.0 installed.`,
            ),
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setStatus((prev) => ({
          ...prev,
          checking: false,
          error: errorMessage,
        }));
        onError(new Error(`Failed to check environment: ${errorMessage}`));
      }
    };

    checkEnvironment();
  }, [onError]);

  useInput((_, key) => {
    if (key.return && canProceed) {
      onComplete();
    }
  });

  if (status.checking) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Welcome to Kodebase! 🚀
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text>Detecting environment...</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Welcome to Kodebase! 🚀
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text>Detecting environment...</Text>
      </Box>

      {/* Git Repository */}
      <Box marginBottom={1}>
        <Text>
          {status.gitRepo ? (
            <Text color="green">✓</Text>
          ) : (
            <Text color="red">✗</Text>
          )}{" "}
          Git repository {status.gitRepo ? "found" : "not found"}
        </Text>
      </Box>

      {/* Node.js Version */}
      <Box marginBottom={1}>
        <Text>
          {status.nodeVersion ? (
            <Text color="green">✓</Text>
          ) : (
            <Text color="red">✗</Text>
          )}{" "}
          Node.js {status.nodeVersion || "not detected"}
        </Text>
      </Box>

      {/* GitHub Repository */}
      <Box marginBottom={1}>
        <Text>
          {status.githubRepo ? (
            <Text color="green">✓</Text>
          ) : (
            <Text color="yellow">⚠</Text>
          )}{" "}
          GitHub repository: {status.githubRepo || "not detected (optional)"}
        </Text>
      </Box>

      {canProceed && (
        <Box marginTop={1}>
          <Text>
            Press{" "}
            <Text bold color="green">
              Enter
            </Text>{" "}
            to continue
          </Text>
        </Box>
      )}

      {status.error && (
        <Box marginTop={1}>
          <Text color="red">Error: {status.error}</Text>
        </Box>
      )}

      {verbose && (
        <Box marginTop={1}>
          <Text dimColor>Working directory: {process.cwd()}</Text>
        </Box>
      )}
    </Box>
  );
};
