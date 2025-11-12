/**
 * Type & Parent Selection Step
 *
 * First step of the AI-assisted wizard. Allows users to:
 * 1. Select artifact type (initiative, milestone, issue)
 * 2. Select parent artifact (for milestone/issue) with searchable list
 *
 * Based on spec: .kodebase/docs/specs/cli/artifact-wizard.md (lines 383-505)
 */

import { QueryService } from "@kodebase/artifacts";
import type { TAnyArtifact, TArtifactType } from "@kodebase/core";
import { Box, Newline, Text } from "ink";
import SelectInput from "ink-select-input";
import type { FC } from "react";
import { useEffect, useState } from "react";

import type { ParentOption, StepComponentProps } from "../types.js";

interface TypeOption {
  value: TArtifactType;
  label: string;
  description: string;
}

/**
 * Get artifact type from ID
 */
function getArtifactTypeFromId(id: string): TArtifactType {
  const segments = id.split(".");
  if (segments.length === 1) return "initiative";
  if (segments.length === 2) return "milestone";
  return "issue";
}

const TYPE_OPTIONS: TypeOption[] = [
  {
    value: "initiative",
    label: "Initiative",
    description: "Top-level epic or theme",
  },
  {
    value: "milestone",
    label: "Milestone",
    description: "Major deliverable with issues",
  },
  {
    value: "issue",
    label: "Issue",
    description: "Atomic unit of work",
  },
];

/**
 * Type & Parent Selection Step Component
 *
 * Combines type selection and parent selection into a single step.
 * Shows parent selection only after type is selected (for milestone/issue).
 */
export const TypeParentSelectionStep: FC<StepComponentProps> = ({
  state,
  onUpdate,
  onNext,
}) => {
  const [showParentSelect, setShowParentSelect] = useState(false);
  const [parentOptions, setParentOptions] = useState<ParentOption[]>([]);
  const [isLoadingParents, setIsLoadingParents] = useState(false);
  const [loadError, setLoadError] = useState<string>("");

  // Load parent options when type is selected and requires parent
  useEffect(() => {
    const loadParents = async () => {
      if (!state.artifactType || state.artifactType === "initiative") {
        setShowParentSelect(false);
        return;
      }

      setIsLoadingParents(true);
      setLoadError("");

      try {
        const queryService = new QueryService();
        const allArtifacts = await queryService.findArtifacts({});

        // Filter by parent type and exclude completed/cancelled
        const validParents = allArtifacts.filter(
          (item: { id: string; artifact: TAnyArtifact }) => {
            const artifact = item.artifact;
            const artifactType = getArtifactTypeFromId(item.id);

            // Milestones need initiative parents
            if (
              state.artifactType === "milestone" &&
              artifactType !== "initiative"
            ) {
              return false;
            }

            // Issues need milestone parents
            if (
              state.artifactType === "issue" &&
              artifactType !== "milestone"
            ) {
              return false;
            }

            // Exclude completed/cancelled artifacts
            const events = artifact.metadata.events || [];
            const latestEvent = events[events.length - 1];
            if (
              latestEvent?.event === "completed" ||
              latestEvent?.event === "cancelled"
            ) {
              return false;
            }

            return true;
          },
        );

        const options: ParentOption[] = validParents.map(
          (item: { id: string; artifact: TAnyArtifact }) => ({
            id: item.id,
            label: `${item.id} - ${item.artifact.metadata.title}`,
            title: item.artifact.metadata.title,
            type: getArtifactTypeFromId(item.id),
          }),
        );

        setParentOptions(options);
        setShowParentSelect(true);
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Failed to load parent artifacts",
        );
      } finally {
        setIsLoadingParents(false);
      }
    };

    loadParents();
  }, [state.artifactType]);

  const handleTypeSelect = (item: { value: TypeOption; label: string }) => {
    onUpdate({
      artifactType: item.value.value,
      parentId: undefined, // Clear parent when changing type
      errors: { ...state.errors, artifactType: "" },
    });

    // If initiative, proceed immediately (no parent needed)
    if (item.value.value === "initiative") {
      onNext();
    }
  };

  const handleParentSelect = (item: { value: ParentOption; label: string }) => {
    onUpdate({
      parentId: item.value.id,
      errors: { ...state.errors, parentId: "" },
    });
    onNext();
  };

  // Show type selection first
  if (!state.artifactType) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">
          Step 1: Type & Parent Selection
        </Text>
        <Text color="gray">What type of artifact do you want to create?</Text>
        <Newline />

        <SelectInput
          items={TYPE_OPTIONS.map((opt) => ({
            key: opt.value,
            label: opt.label,
            value: opt,
          }))}
          onSelect={handleTypeSelect}
          onHighlight={(item) => {
            // Optional: could show description on highlight
            console.log(item);
          }}
        />

        <Newline />
        <Box flexDirection="column" marginLeft={2}>
          {TYPE_OPTIONS.map((opt) => (
            <Box key={opt.value} flexDirection="column" marginBottom={1}>
              <Text color="blue" dimColor>
                {opt.label}: {opt.description}
              </Text>
            </Box>
          ))}
        </Box>

        <Newline />
        <Text color="gray">
          Use ↑↓ arrows to navigate, Enter to select, ESC to cancel
        </Text>
      </Box>
    );
  }

  // Show parent selection for milestone/issue
  if (showParentSelect) {
    if (isLoadingParents) {
      return (
        <Box flexDirection="column">
          <Text bold color="cyan">
            Step 1: Type & Parent Selection
          </Text>
          <Text color="gray">
            Creating: {state.artifactType?.charAt(0).toUpperCase()}
            {state.artifactType?.slice(1)}
          </Text>
          <Newline />
          <Text color="yellow">Loading available parents...</Text>
        </Box>
      );
    }

    if (loadError) {
      return (
        <Box flexDirection="column">
          <Text bold color="cyan">
            Step 1: Type & Parent Selection
          </Text>
          <Text color="gray">
            Creating: {state.artifactType?.charAt(0).toUpperCase()}
            {state.artifactType?.slice(1)}
          </Text>
          <Newline />
          <Text color="red">✗ {loadError}</Text>
          <Newline />
          <Text color="gray">Press ESC to cancel</Text>
        </Box>
      );
    }

    if (parentOptions.length === 0) {
      const parentType =
        state.artifactType === "milestone" ? "initiative" : "milestone";
      return (
        <Box flexDirection="column">
          <Text bold color="cyan">
            Step 1: Type & Parent Selection
          </Text>
          <Text color="gray">
            Creating: {state.artifactType?.charAt(0).toUpperCase()}
            {state.artifactType?.slice(1)}
          </Text>
          <Newline />
          <Text color="yellow">⚠ No available {parentType}s found</Text>
          <Newline />
          <Text color="gray">
            You need to create a {parentType} first before creating a{" "}
            {state.artifactType}.
          </Text>
          <Text color="gray">
            Press ESC to cancel and create a {parentType}.
          </Text>
        </Box>
      );
    }

    return (
      <Box flexDirection="column">
        <Text bold color="cyan">
          Step 1: Type & Parent Selection
        </Text>
        <Text color="gray">
          Creating: {state.artifactType?.charAt(0).toUpperCase()}
          {state.artifactType?.slice(1)}
        </Text>
        <Newline />

        <Text>Select parent artifact:</Text>
        <Newline />

        <SelectInput
          items={parentOptions.map((opt) => ({
            key: opt.id,
            label: opt.label,
            value: opt,
          }))}
          onSelect={handleParentSelect}
        />

        <Newline />
        <Text color="gray">
          Use ↑↓ arrows to navigate, type to search, Enter to select
        </Text>
        <Text color="gray">ESC to cancel</Text>
      </Box>
    );
  }

  // This shouldn't happen, but handle gracefully
  return (
    <Box flexDirection="column">
      <Text color="red">Unexpected state in wizard</Text>
      <Text color="gray">Press ESC to cancel</Text>
    </Box>
  );
};
