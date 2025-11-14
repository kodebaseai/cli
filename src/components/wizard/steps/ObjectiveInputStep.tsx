/**
 * Objective Input Step
 *
 * Second step of the AI-assisted wizard. Collects the user's objective/idea
 * in natural language. This replaces the traditional multi-field form.
 *
 * Based on spec: .kodebase/docs/specs/cli/artifact-wizard.md (lines 507-583)
 */

import { Box, Newline, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { FC } from "react";
import { useState } from "react";

import type { StepComponentProps } from "../types.js";

/**
 * Objective Input Step Component
 *
 * Single-line input for MLP. Multi-line support is post-MLP.
 * Asks for the user's objective/idea and confirms AI assistance usage.
 */
export const ObjectiveInputStep: FC<StepComponentProps> = ({
  state,
  onUpdate,
  onNext,
  onBack,
}) => {
  const [objectiveValue, setObjectiveValue] = useState(state.objective);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleObjectiveSubmit = () => {
    const trimmed = objectiveValue.trim();
    if (trimmed.length < 10) {
      onUpdate({
        errors: {
          ...state.errors,
          objective: "Objective must be at least 10 characters",
        },
      });
      return;
    }

    onUpdate({
      objective: trimmed,
      errors: { ...state.errors, objective: "" },
    });

    setShowConfirm(true);
  };

  const handleConfirmAI = (useAI: boolean) => {
    if (useAI) {
      onNext();
    } else {
      // For MLP, we only support AI-assisted flow
      // Show message that manual flow is not available yet
      onUpdate({
        errors: {
          ...state.errors,
          objective:
            "Manual flow not available in MLP. Please use AI assistance.",
        },
      });
      setShowConfirm(false);
    }
  };

  // Handle keyboard input for confirmation screen
  useInput(
    (input, key) => {
      if (showConfirm) {
        // During confirmation, handle Y/N/B keys
        if (input === "y" || input === "Y" || key.return) {
          handleConfirmAI(true);
        } else if (input === "b" || input === "B") {
          // Go back to previous step
          if (onBack) {
            onBack();
          }
        } else if (input === "n" || input === "N") {
          handleConfirmAI(false);
        }
      }
    },
    { isActive: showConfirm },
  );

  const artifactTypeLabel = state.artifactType
    ? state.artifactType.charAt(0).toUpperCase() + state.artifactType.slice(1)
    : "";

  // Show confirmation after objective is entered
  if (showConfirm) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">
          Confirm AI Assistance
        </Text>
        <Text color="gray">
          Creating: {artifactTypeLabel}
          {state.parentId && ` under ${state.parentId}`}
        </Text>
        <Newline />

        <Box flexDirection="column" marginLeft={2}>
          <Text color="green">✓ Objective captured:</Text>
          <Box marginLeft={2}>
            <Text>{state.objective}</Text>
          </Box>
        </Box>

        <Newline />
        <Text bold>Use AI assistance to generate artifact? (Y/n)</Text>
        <Newline />
        <Text color="gray">
          Your AI assistant will transform this objective into a structured
          artifact
        </Text>
        <Text color="gray">
          with metadata, deliverables, and acceptance criteria.
        </Text>
        <Newline />

        <Box>
          <Text color="green">Press Y or Enter to continue with AI </Text>
          <Text color="gray">| </Text>
          <Text color="yellow">B to go back </Text>
          <Text color="gray">| </Text>
          <Text color="red">ESC to cancel</Text>
        </Box>
      </Box>
    );
  }

  // Show objective input
  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        Describe Your Objective
      </Text>
      <Text color="gray">
        Creating {artifactTypeLabel}
        {state.parentId && ` under ${state.parentId}`}
      </Text>
      <Newline />

      <Text>What do you want to achieve with this {state.artifactType}?</Text>
      <Newline />
      <Text color="gray" dimColor>
        Describe your objective in a few sentences. Your AI assistant
      </Text>
      <Text color="gray" dimColor>
        will help structure this into a complete artifact.
      </Text>
      <Newline />

      <Box>
        <Text color="blue">▸ </Text>
        <TextInput
          value={objectiveValue}
          onChange={setObjectiveValue}
          onSubmit={handleObjectiveSubmit}
          placeholder="Enter your objective..."
        />
      </Box>

      <Newline />

      {state.errors.objective && (
        <>
          <Text color="red">✗ {state.errors.objective}</Text>
          <Newline />
        </>
      )}

      <Box>
        <Text color="gray">Press Enter to continue </Text>
        <Text color="gray">| </Text>
        <Text color="yellow">B to go back </Text>
        <Text color="gray">| </Text>
        <Text color="red">ESC to cancel</Text>
      </Box>

      <Newline />
      <Text color="blue" dimColor>
        💡 Example: "Implement OAuth 2.0 authentication with GitHub and Google
      </Text>
      <Text color="blue" dimColor>
        providers, including token refresh and error handling"
      </Text>
    </Box>
  );
};
