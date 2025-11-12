/**
 * AI Completion Wait Step (IDE Flow)
 *
 * Fourth step for IDE-based AI flow. Watches for the AI agent to create
 * the artifact file using chokidar file watcher.
 *
 * Based on spec: .kodebase/docs/specs/cli/artifact-wizard.md (lines 820-962)
 */

import path from "node:path";
import { ArtifactService, ValidationService } from "@kodebase/artifacts";
import { resolveArtifactPaths, type TAnyArtifact } from "@kodebase/core";
import chokidar from "chokidar";
import { Box, Newline, Text } from "ink";
import Spinner from "ink-spinner";
import type { FC } from "react";
import { useEffect, useState } from "react";

import type { StepComponentProps } from "../types.js";

interface WaitResult {
  success: boolean;
  artifact?: TAnyArtifact;
  filePath?: string;
  id?: string;
  errors?: string[];
  suggestion?: string;
}

/**
 * AI Completion Wait Step Component
 *
 * Waits for IDE-based AI to create the artifact file, with 60s timeout
 */
export const AICompletionWaitStep: FC<StepComponentProps> = ({
  state,
  onUpdate,
}) => {
  const [isWaiting, setIsWaiting] = useState(true);
  const [waitResult, setWaitResult] = useState<WaitResult | null>(null);
  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    const waitForArtifact = async () => {
      if (!state.artifactType) {
        setWaitResult({
          success: false,
          errors: ["No artifact type specified"],
        });
        setIsWaiting(false);
        return;
      }

      try {
        const result = await watchForArtifactFile({
          parentId: state.parentId,
          artifactType: state.artifactType,
        });

        setWaitResult(result);

        if (result.success && result.artifact && result.filePath && result.id) {
          // Update state with created artifact
          onUpdate({
            artifact: result.artifact,
            filePath: result.filePath,
            errors: {},
          });
        }

        setIsWaiting(false);
      } catch (error) {
        if (error instanceof Error && error.message.includes("Timeout")) {
          setTimeoutReached(true);
        } else {
          setWaitResult({
            success: false,
            errors: [error instanceof Error ? error.message : "Unknown error"],
          });
        }
        setIsWaiting(false);
      }
    };

    waitForArtifact();
  }, [state.parentId, state.artifactType, onUpdate]);

  if (isWaiting) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">
          Step 4: Waiting for AI...
        </Text>
        <Newline />

        <Text color="green">📋 Prompt copied to clipboard!</Text>
        <Newline />

        <Text>Waiting for your AI agent to create the artifact file...</Text>
        <Newline />

        <Box>
          <Text color="yellow">
            <Spinner type="dots" />
          </Text>
          <Text> Watching for file creation...</Text>
        </Box>
        <Newline />

        <Text color="gray" dimColor>
          Expected path: .kodebase/artifacts/
          {state.parentId ? `${state.parentId}.*` : "*"}/
        </Text>
        <Newline />

        <Text color="gray">
          The wizard will automatically detect when the file is created.
        </Text>
        <Text color="gray">Press ESC to cancel</Text>
      </Box>
    );
  }

  if (timeoutReached) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">
          Step 4: Waiting for AI...
        </Text>
        <Newline />

        <Text color="red">
          ✗ Timeout: AI did not create artifact within 60 seconds
        </Text>
        <Newline />

        <Text bold>What would you like to do?</Text>
        <Box flexDirection="column" marginLeft={2}>
          <Text>1. Wait another 60 seconds (press W)</Text>
          <Text>2. Switch to manual paste (press M)</Text>
          <Text>3. Go back and regenerate prompt (press B)</Text>
          <Text>4. Cancel wizard (press ESC)</Text>
        </Box>
        <Newline />

        <Text color="gray">
          Tip: Make sure the AI has access to create files in your project
          directory
        </Text>
      </Box>
    );
  }

  if (waitResult && !waitResult.success) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">
          Step 4: Waiting for AI...
        </Text>
        <Newline />

        <Text color="red">✗ AI created artifact but validation failed:</Text>
        <Box flexDirection="column" marginLeft={2}>
          {waitResult.errors?.map((error) => (
            <Text key={error} color="red">
              - {error}
            </Text>
          ))}
        </Box>
        <Newline />

        {waitResult.suggestion && (
          <>
            <Text color="yellow">💡 {waitResult.suggestion}</Text>
            <Newline />
          </>
        )}

        <Text bold>What would you like to do?</Text>
        <Box flexDirection="column" marginLeft={2}>
          <Text>1. Delete and regenerate with AI (press R)</Text>
          <Text>2. Go back to prompt generation (press B)</Text>
          <Text>3. Cancel wizard (press ESC)</Text>
        </Box>
      </Box>
    );
  }

  if (waitResult?.success) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">
          Step 4: AI Completion
        </Text>
        <Newline />

        <Box flexDirection="column">
          <Text color="green">✓ Artifact file detected!</Text>
          <Text color="green">✓ Loading artifact...</Text>
          <Text color="green">✓ Validating structure...</Text>
          <Text color="green" bold>
            ✓ Validation passed!
          </Text>
        </Box>
        <Newline />

        <Text color="gray">File: {waitResult.filePath}</Text>
        <Newline />

        <Box>
          <Text color="green" bold>
            Press Enter to continue to preview
          </Text>
          <Text color="gray"> | </Text>
          <Text color="yellow">B to go back</Text>
          <Text color="gray"> | </Text>
          <Text color="red">ESC to cancel</Text>
        </Box>
      </Box>
    );
  }

  return null;
};

/**
 * Watch for artifact file creation using chokidar
 */
async function watchForArtifactFile(options: {
  parentId?: string;
  artifactType: string;
}): Promise<WaitResult> {
  const { parentId } = options;
  const artifactService = new ArtifactService();
  const validationService = new ValidationService();

  // Determine expected ID and watch pattern
  const baseDir = process.cwd();
  const artifactsDir = path.join(baseDir, ".kodebase/artifacts");

  // Watch pattern - be flexible with slugs
  const watchPattern = parentId
    ? path.join(artifactsDir, `**/${parentId}.*/*.yml`)
    : path.join(artifactsDir, "*/*.yml");

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      watcher.close();
      reject(new Error("Timeout waiting for AI to create artifact (60s)"));
    }, 60000);

    const watcher = chokidar.watch(watchPattern, {
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
    });

    watcher.on("add", async (filePath) => {
      clearTimeout(timeout);
      watcher.close();

      try {
        // Extract ID from file path
        const id = path.basename(filePath, ".yml");

        // Read the artifact
        const artifact = await artifactService.getArtifact({ id, baseDir });

        // Get file path using resolveArtifactPaths
        const { filePath: resolvedFilePath } = await resolveArtifactPaths({
          id,
          baseDir,
        });

        // Validate schema
        const validationResult = await validationService.validateArtifact(
          artifact,
          { artifactId: id },
        );

        if (!validationResult.valid) {
          resolve({
            success: false,
            errors: validationResult.errors.map((e) => e.message),
            suggestion:
              "AI created invalid artifact. You can edit manually or regenerate.",
            filePath: resolvedFilePath,
          });
        } else {
          resolve({
            success: true,
            artifact,
            filePath: resolvedFilePath,
            id,
          });
        }
      } catch (error) {
        resolve({
          success: false,
          errors: [
            `Failed to parse AI-created file: ${error instanceof Error ? error.message : "Unknown error"}`,
          ],
          filePath,
        });
      }
    });

    watcher.on("error", (error) => {
      clearTimeout(timeout);
      watcher.close();
      reject(error);
    });
  });
}
