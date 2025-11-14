/**
 * Preset Selection Step
 *
 * Core step of setup wizard - maps team size to configuration preset:
 * - Solo → solo preset (direct commits, fast workflow)
 * - Small team (2-10) → small_team preset (cascade PRs with auto-merge)
 * - Large team (10+) → enterprise preset (cascade PRs with approval)
 */

import type { ConfigPreset } from "@kodebase/config";
import {
  enterprisePreset,
  smallTeamPreset,
  soloPreset,
} from "@kodebase/config";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import type { FC } from "react";
import { useState } from "react";

interface PresetSelectionStepProps {
  onComplete: (
    preset: ConfigPreset,
    presetName: "solo" | "small_team" | "enterprise",
  ) => void;
  onError: (error: Error) => void;
  preselectedPreset?: "solo" | "small_team" | "enterprise";
  verbose?: boolean;
}

interface PresetOption {
  label: string;
  value: "solo" | "small_team" | "enterprise";
  description: string;
  config: ConfigPreset;
}

const presetOptions: PresetOption[] = [
  {
    label: "Just me (solo)",
    value: "solo",
    description:
      "Fast iteration, direct commits, minimal overhead. Recommended for individual developers.",
    config: soloPreset,
  },
  {
    label: "Small team (2-10 people)",
    value: "small_team",
    description:
      "Cascade PRs with auto-merge on approval. Balanced collaboration workflow.",
    config: smallTeamPreset,
  },
  {
    label: "Large team (10+ people)",
    value: "enterprise",
    description:
      "Cascade PRs with manual approval. Strict controls and safety for large organizations.",
    config: enterprisePreset,
  },
];

/**
 * Preset Selection Step
 *
 * Interactive team size selection that maps to configuration presets.
 * This determines the git-ops workflow (direct commits vs PRs, auto-merge settings, etc.)
 */
export const PresetSelectionStep: FC<PresetSelectionStepProps> = ({
  onComplete,
  onError,
  preselectedPreset,
  verbose,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<
    "solo" | "small_team" | "enterprise" | null
  >(preselectedPreset || null);

  // If preset was preselected via CLI flag, auto-complete
  if (preselectedPreset && !selectedPreset) {
    const option = presetOptions.find((p) => p.value === preselectedPreset);
    if (option) {
      setTimeout(() => {
        onComplete(option.config, option.value);
      }, 100);
    } else {
      onError(
        new Error(
          `Invalid preset: ${preselectedPreset}. Must be one of: solo, small_team, enterprise`,
        ),
      );
    }
    return null;
  }

  const handleSelect = (item: { value: string }) => {
    const option = presetOptions.find((p) => p.value === item.value);
    if (!option) {
      onError(new Error(`Invalid preset selected: ${item.value}`));
      return;
    }

    setSelectedPreset(option.value);
    onComplete(option.config, option.value);
  };

  // If already selected but processing, show loading state
  if (selectedPreset) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold>Preset Selection</Text>
        </Box>

        <Box marginBottom={1}>
          <Text>
            Selected:{" "}
            <Text bold color="cyan">
              {selectedPreset}
            </Text>
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text bold>Choose Your Workflow Preset</Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>
          This determines your git-ops configuration (cascades, PRs,
          validation).
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text>How many people are on your team?</Text>
      </Box>

      <Box marginLeft={2}>
        <SelectInput
          items={presetOptions.map((option) => ({
            label: `${option.label}${option.value === "solo" ? " [RECOMMENDED]" : ""}`,
            value: option.value,
          }))}
          onSelect={handleSelect}
        />
      </Box>

      {verbose && (
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>Preset details:</Text>
          {presetOptions.map((option) => (
            <Box key={option.value} marginLeft={2} marginTop={1}>
              <Text dimColor>
                • {option.label}: {option.description}
              </Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};
