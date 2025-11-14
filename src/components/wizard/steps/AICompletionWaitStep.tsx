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
import { Box, Newline, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import type { FC } from "react";
import { useEffect, useState } from "react";

import { parseArtifactFromPath } from "../../../utils/artifact-id-parser.js";
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
  onNext,
}) => {
  const [isWaiting, setIsWaiting] = useState(true);
  const [waitResult, setWaitResult] = useState<WaitResult | null>(null);
  const [timeoutReached, setTimeoutReached] = useState(false);

  // Handle keyboard input when artifact is ready
  useInput(
    (_input, key) => {
      if (waitResult?.success && key.return) {
        onNext();
      }
    },
    { isActive: waitResult?.success === true },
  );

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
          existingFilePath: state.filePath,
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
  }, [state.parentId, state.artifactType, state.filePath, onUpdate]);

  if (isWaiting) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">
          Waiting for AI...
        </Text>
        <Newline />

        <Text color="green">📋 Prompt copied to clipboard!</Text>
        <Newline />

        {state.filePath && (
          <>
            <Text color="yellow">📄 Scaffold file: {state.filePath}</Text>
            <Newline />
          </>
        )}

        <Text>Waiting for your AI agent to fill in the artifact file...</Text>
        <Newline />

        <Box>
          <Text color="yellow">
            <Spinner type="dots" />
          </Text>
          <Text>
            {" "}
            {state.filePath
              ? "Watching for file changes..."
              : "Watching for file creation..."}
          </Text>
        </Box>
        <Newline />

        <Text color="gray">
          The wizard will automatically detect when the file is completed.
        </Text>
        <Text color="gray">Press ESC to cancel</Text>
      </Box>
    );
  }

  if (timeoutReached) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">
          Waiting for AI...
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
          Waiting for AI...
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
          AI Completion
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
 * Watch for artifact file changes using chokidar
 *
 * Now watches for modifications to the scaffold file rather than creation
 */
async function watchForArtifactFile(options: {
  parentId?: string;
  artifactType: string;
  existingFilePath?: string;
}): Promise<WaitResult> {
  const { parentId, existingFilePath } = options;
  const artifactService = new ArtifactService();
  const validationService = new ValidationService();

  // Determine expected ID and watch pattern
  const baseDir = process.cwd();
  const artifactsDir = path.join(baseDir, ".kodebase/artifacts");

  // If we have an existing file path (scaffold), we need to watch both:
  // 1. The specific scaffold file (for in-place edits)
  // 2. Any new files with the same ID (for AI creating new directories)
  let watchPattern: string | string[];
  if (existingFilePath) {
    const id = path.basename(existingFilePath, ".yml");
    // Watch both the scaffold file AND any new directories with the same ID
    watchPattern = [
      existingFilePath, // Watch the scaffold for changes
      path.join(artifactsDir, `${id}.*`, `${id}.yml`), // Watch for new files with same ID
    ];
  } else {
    // Legacy: watch for new files matching the pattern
    watchPattern = parentId
      ? path.join(artifactsDir, `**/${parentId}.*/*.yml`)
      : path.join(artifactsDir, "*/*.yml");
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      watcher.close();
      reject(new Error("Timeout waiting for AI to complete artifact (60s)"));
    }, 60000);

    const watcher = chokidar.watch(watchPattern, {
      // When watching scaffold + new files, we want:
      // - Don't ignore initial for the scaffold (to detect changes)
      // - Ignore initial for new patterns (only want new files)
      // Since we're mixing both, use false to catch everything
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
    });

    // Watch for both 'add' (new files) and 'change' (scaffold updates)
    const handleFileEvent = async (filePath: string) => {
      try {
        // Extract ID and slug from file path using utility function
        const { id, slug } = parseArtifactFromPath(filePath);

        // Read the artifact
        const artifact = await artifactService.getArtifact({
          id,
          slug,
          baseDir,
        });

        // Check if this is just a scaffold (empty content sections)
        // Don't trigger on scaffold creation, only on actual completion
        // Determine artifact type from ID (A = initiative, A.1 = milestone, A.1.1 = issue)
        const idParts = id.split(".");
        const isInitiative = idParts.length === 1;
        let isScaffold = false;

        if (isInitiative) {
          // Initiatives have 'vision' field and scope/success_criteria arrays
          const content = artifact.content as {
            vision?: string;
            scope?: { in?: string[]; out?: string[] };
            success_criteria?: string[];
          };
          const vision = content?.vision;
          const scopeIn = content?.scope?.in;
          const successCriteria = content?.success_criteria;

          // Check if this is a scaffold by looking for TODO placeholders or empty content
          const hasVisionTodo =
            !vision ||
            vision.trim() === "" ||
            vision === ">" ||
            vision.includes("TODO");
          const hasScopeInTodo =
            scopeIn &&
            scopeIn.length > 0 &&
            scopeIn[0] !== undefined &&
            scopeIn[0].includes("TODO");
          const hasSuccessCriteriaTodo =
            successCriteria &&
            successCriteria.length > 0 &&
            successCriteria[0] !== undefined &&
            successCriteria[0].includes("TODO");

          isScaffold =
            hasVisionTodo ||
            Boolean(hasScopeInTodo) ||
            Boolean(hasSuccessCriteriaTodo);
        } else {
          // Milestones and Issues have 'summary' field
          const summary = (artifact.content as { summary?: string })?.summary;
          isScaffold =
            !summary ||
            summary.trim() === "" ||
            summary === ">" ||
            summary.includes("TODO");
        }

        if (isScaffold) {
          // This is just the scaffold, keep waiting for real content
          return;
        }

        // File has real content, stop watching
        clearTimeout(timeout);
        watcher.close();

        // Get file path using resolveArtifactPaths (pass the slug we extracted!)
        const { filePath: resolvedFilePath } = await resolveArtifactPaths({
          id,
          slug,
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
            `Failed to parse AI-completed file: ${error instanceof Error ? error.message : "Unknown error"}`,
          ],
          filePath,
        });
      }
    };

    // Watch for both file creation and changes
    watcher.on("add", handleFileEvent);
    watcher.on("change", handleFileEvent);

    watcher.on("error", (error) => {
      clearTimeout(timeout);
      watcher.close();
      reject(error);
    });
  });
}
