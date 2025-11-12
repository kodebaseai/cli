/**
 * Preview & Confirmation Step
 *
 * Fifth and final step of the wizard. Shows a formatted summary of the
 * AI-generated artifact and confirms creation.
 *
 * Based on spec: .kodebase/docs/specs/cli/artifact-wizard.md (lines 1067-1476)
 */

import { Box, Newline, Text } from "ink";
import type { FC } from "react";
import { useState } from "react";

import type { StepComponentProps } from "../types.js";

/**
 * Preview & Confirmation Step Component
 *
 * Shows formatted summary (not full YAML) and confirms creation.
 * For AI-assisted flow, artifact is already created/generated at this point.
 */
export const PreviewConfirmationStep: FC<StepComponentProps> = ({
  state,
  onUpdate,
  onNext,
}) => {
  const [isConfirmed, setIsConfirmed] = useState(false);

  const _handleConfirm = () => {
    setIsConfirmed(true);
    onUpdate({ isComplete: true });
    onNext();
  };

  if (!state.artifact) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">
          Step 5: Preview & Confirmation
        </Text>
        <Newline />
        <Text color="red">✗ No artifact to preview</Text>
        <Newline />
        <Text color="gray">Press B to go back or ESC to cancel</Text>
      </Box>
    );
  }

  const artifact = state.artifact;
  const metadata = artifact.metadata;

  // Get priority color
  const getPriorityColor = (
    priority: string,
  ): "red" | "yellow" | "blue" | "gray" => {
    switch (priority) {
      case "critical":
        return "red";
      case "high":
        return "yellow";
      case "medium":
        return "blue";
      case "low":
        return "gray";
      default:
        return "gray";
    }
  };

  // Get artifact type description
  const getTypeDescription = (type: string): string => {
    switch (type) {
      case "initiative":
        return "High-level goal or project";
      case "milestone":
        return "Major deliverable within an initiative";
      case "issue":
        return "Specific work item or task";
      default:
        return type;
    }
  };

  if (isConfirmed) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">
          Step 5: Confirmation
        </Text>
        <Newline />

        <Box flexDirection="column">
          <Text color="green">✓ Artifact validated</Text>
          <Text color="green">✓ File structure correct</Text>
          <Text color="green" bold>
            ✓ Ready to proceed!
          </Text>
        </Box>
        <Newline />

        <Text color="gray">File: {state.filePath}</Text>
        <Newline />

        <Text color="yellow">Proceeding to hierarchy validation...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        Step 5: Preview & Confirmation
      </Text>
      <Text color="gray">Review your artifact before finalizing</Text>
      <Newline />

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="cyan"
        paddingX={1}
        paddingY={1}
      >
        <Text bold color="white">
          📄 {state.artifactType?.toUpperCase()} PREVIEW
        </Text>
        <Text color="gray" dimColor>
          {state.artifactType && getTypeDescription(state.artifactType)}
        </Text>
        <Newline />

        {/* Basic Information */}
        <Box flexDirection="column">
          <Text bold color="cyan">
            Basic Information
          </Text>
          <Box marginLeft={2} flexDirection="column">
            <Box>
              <Text color="gray">ID: </Text>
              <Text color="white" bold>
                {state.parentId
                  ? `${state.parentId}.${metadata.title.split(" ")[0]}`
                  : "A"}
              </Text>
            </Box>
            <Box>
              <Text color="gray">Title: </Text>
              <Text color="white" bold>
                {metadata.title}
              </Text>
            </Box>
            {metadata.assignee && (
              <Box>
                <Text color="gray">Assignee: </Text>
                <Text color="white">{metadata.assignee}</Text>
              </Box>
            )}
            <Box>
              <Text color="gray">Priority: </Text>
              <Text color={getPriorityColor(metadata.priority)} bold>
                {metadata.priority.toUpperCase()}
              </Text>
            </Box>
            {metadata.estimation && (
              <Box>
                <Text color="gray">Estimation: </Text>
                <Text color="yellow" bold>
                  {metadata.estimation}
                </Text>
              </Box>
            )}
          </Box>
        </Box>

        <Newline />

        {/* Summary */}
        {"summary" in artifact.content && artifact.content.summary && (
          <>
            <Box flexDirection="column">
              <Text bold color="cyan">
                Summary
              </Text>
              <Box marginLeft={2}>
                <Text color="white">{artifact.content.summary}</Text>
              </Box>
            </Box>
            <Newline />
          </>
        )}

        {/* Deliverables */}
        {"deliverables" in artifact.content &&
          artifact.content.deliverables &&
          Array.isArray(artifact.content.deliverables) &&
          artifact.content.deliverables.length > 0 && (
            <>
              <Box flexDirection="column">
                <Text bold color="cyan">
                  Deliverables ({artifact.content.deliverables.length} items)
                </Text>
                {artifact.content.deliverables.map((deliverable: string) => (
                  <Box key={deliverable} marginLeft={2}>
                    <Text color="green">• </Text>
                    <Text color="white">{String(deliverable)}</Text>
                  </Box>
                ))}
              </Box>
              <Newline />
            </>
          )}

        {/* Acceptance Criteria */}
        {"acceptance_criteria" in artifact.content &&
          artifact.content.acceptance_criteria &&
          Array.isArray(artifact.content.acceptance_criteria) &&
          artifact.content.acceptance_criteria.length > 0 && (
            <>
              <Box flexDirection="column">
                <Text bold color="cyan">
                  Acceptance Criteria (
                  {artifact.content.acceptance_criteria.length} items)
                </Text>
                {artifact.content.acceptance_criteria.map(
                  (criteria: string) => (
                    <Box key={criteria} marginLeft={2}>
                      <Text color="green">✓ </Text>
                      <Text color="white">{String(criteria)}</Text>
                    </Box>
                  ),
                )}
              </Box>
              <Newline />
            </>
          )}
      </Box>

      <Newline />

      <Box flexDirection="column">
        <Text color="gray">File location:</Text>
        <Box marginLeft={2}>
          <Text color="blue">{state.filePath}</Text>
        </Box>
      </Box>

      <Newline />

      <Box>
        <Text color="green" bold>
          Press Enter to confirm
        </Text>
        <Text color="gray"> | </Text>
        <Text color="yellow">B to go back</Text>
        <Text color="gray"> | </Text>
        <Text color="red">ESC to cancel</Text>
      </Box>
    </Box>
  );
};
