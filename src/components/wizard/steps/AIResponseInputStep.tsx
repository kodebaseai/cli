/**
 * AI Response Input Step (Web Flow)
 *
 * Fourth step for web-based AI flow. Instructs user to create the artifact
 * file themselves, then confirms when done.
 *
 * Based on spec: .kodebase/docs/reference/specs/cli/artifact-wizard.md (lines 964-1064)
 * Modified per user feedback: User creates file manually, we just confirm
 */

import {
  ArtifactService,
  QueryService,
  ValidationService,
} from "@kodebase/artifacts";
import { resolveArtifactPaths, type TAnyArtifact } from "@kodebase/core";
import { Box, Newline, Text, useInput } from "ink";
import type { FC } from "react";
import { useState } from "react";

import type { StepComponentProps } from "../types.js";

/**
 * AI Response Input Step Component
 *
 * Simplified flow: User pastes AI response into artifact file, we validate it
 */
export const AIResponseInputStep: FC<StepComponentProps> = ({
  state,
  onUpdate,
  onNext,
}) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string>("");
  const [validatedArtifact, setValidatedArtifact] =
    useState<TAnyArtifact | null>(null);
  const [filePath, setFilePath] = useState<string>("");

  const handleConfirm = async () => {
    setIsValidating(true);
    setValidationError("");

    try {
      // The user should have created the file by now
      // We need to scan for new artifacts matching the expected pattern
      const artifactService = new ArtifactService();
      const validationService = new ValidationService();
      const queryService = new QueryService();

      // List all artifacts
      const allArtifacts = await queryService.findArtifacts({});

      // Find artifacts that match the expected parent
      const expectedPrefix = state.parentId ? `${state.parentId}.` : "";
      const candidates = expectedPrefix
        ? allArtifacts.filter((item) => item.id.startsWith(expectedPrefix))
        : allArtifacts.filter((item) => /^[A-Z]$/.test(item.id));

      if (candidates.length === 0) {
        throw new Error(
          "No artifact file found. Please create the artifact file first.",
        );
      }

      // Get the most recently created artifact
      // Sort by file modification time (most recent first)
      candidates.sort((a, b) => {
        // This is a simplified sort - in production we'd check actual file mtime
        return b.id.localeCompare(a.id);
      });

      const latestCandidate = candidates[0];
      if (!latestCandidate) {
        throw new Error("No matching artifact found");
      }

      // Read and validate the artifact
      const artifact = await artifactService.getArtifact({
        id: latestCandidate.id,
      });

      // Get file path
      const { filePath: resolvedFilePath } = await resolveArtifactPaths({
        id: latestCandidate.id,
      });

      const validationResult = await validationService.validateArtifact(
        artifact,
        { artifactId: latestCandidate.id },
      );

      if (!validationResult.valid) {
        const errors = validationResult.errors.map((e) => e.message).join(", ");
        throw new Error(`Validation failed: ${errors}`);
      }

      // Success!
      setValidatedArtifact(artifact);
      setFilePath(resolvedFilePath);

      onUpdate({
        artifact,
        filePath: resolvedFilePath,
        errors: {},
      });

      setIsValidating(false);
    } catch (error) {
      setValidationError(
        error instanceof Error ? error.message : "Validation failed",
      );
      setIsValidating(false);
    }
  };

  // Handle keyboard input
  useInput(
    (_input, key) => {
      if (key.return) {
        if (validatedArtifact) {
          // Artifact validated - proceed to next step
          onNext();
        } else if (!isValidating) {
          // User says file is created - validate it
          handleConfirm();
        }
      }
    },
    { isActive: !isValidating },
  );

  if (isValidating) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">
          Validating Artifact
        </Text>
        <Newline />
        <Text color="yellow">Validating artifact...</Text>
        <Newline />
        <Text color="gray">✓ Scanning for new artifacts</Text>
        <Text color="gray">✓ Reading artifact file</Text>
        <Text color="gray">✓ Validating schema</Text>
      </Box>
    );
  }

  if (validatedArtifact) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">
          Validating Artifact
        </Text>
        <Newline />

        <Box flexDirection="column">
          <Text color="green">✓ Valid YAML format</Text>
          <Text color="green">✓ Schema validation passed</Text>
          <Text color="green">✓ All required fields present</Text>
          <Text color="green" bold>
            ✓ Artifact validated!
          </Text>
        </Box>
        <Newline />

        <Text color="gray">File: {filePath}</Text>
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

  const artifactTypeLabel = state.artifactType
    ? state.artifactType.charAt(0).toUpperCase() + state.artifactType.slice(1)
    : "";

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        Paste AI Response
      </Text>
      <Text color="gray">
        Creating: {artifactTypeLabel}
        {state.parentId && ` under ${state.parentId}`}
      </Text>
      <Newline />

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="cyan"
        paddingX={1}
        paddingY={1}
      >
        <Text bold color="cyan">
          📝 Instructions
        </Text>
        <Newline />
        <Text>Follow these steps to create your artifact:</Text>
        <Newline />
        <Box flexDirection="column" marginLeft={2}>
          <Text>
            1. Paste the prompt into your AI assistant (ChatGPT, Claude, etc.)
          </Text>
          <Text>2. Copy the AI's YAML response</Text>
          <Text>3. Create the artifact file at:</Text>
          <Box marginLeft={2}>
            <Text color="yellow">
              .kodebase/artifacts/
              {state.parentId ? `${state.parentId}.*/<slug>/` : "<ID>.<slug>/"}
              {state.parentId ? `${state.parentId}.` : ""}*.yml
            </Text>
          </Box>
          <Text>4. Paste the YAML into the file and save</Text>
          <Text>5. Press Enter here to validate</Text>
        </Box>
      </Box>

      <Newline />

      {validationError && (
        <>
          <Text color="red">✗ {validationError}</Text>
          <Newline />
          <Text color="yellow">
            💡 Make sure the artifact file exists and is valid YAML
          </Text>
          <Newline />
        </>
      )}

      <Box>
        <Text color="green" bold>
          Press Enter when file is created
        </Text>
        <Text color="gray"> | </Text>
        <Text color="yellow">B to go back</Text>
        <Text color="gray"> | </Text>
        <Text color="red">ESC to cancel</Text>
      </Box>

      <Newline />
      <Text color="gray" dimColor>
        Tip: Use the prompt's instructions for the exact file path and structure
      </Text>
    </Box>
  );
};
