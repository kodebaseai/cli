/**
 * Hierarchy Validation Menu Component
 *
 * Displays hierarchy validation results and prompts user for next action.
 * Used by Add command after each artifact creation to enforce hierarchy rules.
 *
 * Based on spec: .kodebase/docs/specs/cli/artifact-wizard.md (Hierarchy Validation)
 */

import { ArtifactService } from "@kodebase/artifacts";
import { CArtifact } from "@kodebase/core";
import { Box, Newline, Text } from "ink";
import SelectInput from "ink-select-input";
import type { FC } from "react";
import { useEffect, useState } from "react";
import {
  ArtifactTreeView,
  type TreeArtifact,
} from "./wizard/components/ArtifactTreeView.js";
import type {
  HierarchyValidationResult,
  NextStepAction,
} from "./wizard/types.js";

export interface HierarchyValidationMenuProps {
  /** Validation result from HierarchyValidationService */
  validationResult: HierarchyValidationResult;
  /** Callback when user selects an action */
  onSelectAction: (action: NextStepAction) => void;
  /** Callback when user aborts (ESC key) */
  onAbort: () => void;
  /** Verbose mode flag */
  verbose?: boolean;
}

interface SelectItem {
  label: string;
  value: NextStepAction;
}

/**
 * Hierarchy Validation Menu Component
 *
 * Shows validation status and available next steps.
 */
export const HierarchyValidationMenu: FC<HierarchyValidationMenuProps> = ({
  validationResult,
  onSelectAction,
  onAbort: _onAbort,
  verbose,
}) => {
  const [hasSelected, setHasSelected] = useState(false);
  const [treeArtifacts, setTreeArtifacts] = useState<TreeArtifact[]>([]);

  // Load artifact details for tree view
  useEffect(() => {
    const loadArtifacts = async () => {
      if (!validationResult.context) return;

      const artifactService = new ArtifactService();
      const baseDir = process.cwd();

      const artifacts = await Promise.all(
        validationResult.context.createdArtifacts.map(async (id) => {
          try {
            const artifact = await artifactService.getArtifact({ id, baseDir });
            const parts = id.split(".");
            const type =
              parts.length === 1
                ? CArtifact.INITIATIVE
                : parts.length === 2
                  ? CArtifact.MILESTONE
                  : CArtifact.ISSUE;

            return {
              id,
              title: artifact.metadata.title,
              type,
            } as TreeArtifact;
          } catch {
            // Fallback if artifact can't be loaded
            return {
              id,
              title: `Artifact ${id}`,
              type: CArtifact.ISSUE,
            };
          }
        }),
      );

      setTreeArtifacts(artifacts);
    };

    loadArtifacts();
  }, [validationResult.context]);

  const handleSelect = (item: SelectItem) => {
    setHasSelected(true);
    onSelectAction(item.value);
  };

  // Convert actions to select items
  const items: SelectItem[] = validationResult.actions.map((action) => ({
    label: action.isRequired ? `${action.label} (REQUIRED)` : action.label,
    value: action,
  }));

  // Determine status icon and color
  const statusIcon = validationResult.valid ? "✓" : "⚠";
  const statusColor = validationResult.valid ? "green" : "yellow";

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="cyan">
          Hierarchy Validation
        </Text>
        <Box>
          <Text color={statusColor} bold>
            {statusIcon}{" "}
          </Text>
          <Text color="white">{validationResult.message}</Text>
        </Box>
      </Box>

      {/* Show tree view of created artifacts */}
      {treeArtifacts.length > 0 && (
        <>
          <ArtifactTreeView artifacts={treeArtifacts} />
          <Newline />
        </>
      )}

      {verbose && validationResult.context && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="gray" dimColor>
            Batch Context:
          </Text>
          <Box marginLeft={2} flexDirection="column">
            <Text color="gray" dimColor>
              Root: {validationResult.context.rootArtifactId} (
              {validationResult.context.rootArtifactType})
            </Text>
            <Text color="gray" dimColor>
              Created: {validationResult.context.createdArtifacts.join(", ")}
            </Text>
            {validationResult.context.incompleteMilestones.length > 0 && (
              <Text color="gray" dimColor>
                Incomplete Milestones:{" "}
                {validationResult.context.incompleteMilestones.join(", ")}
              </Text>
            )}
          </Box>
        </Box>
      )}

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="cyan">
          What would you like to do next?
        </Text>
      </Box>

      {!hasSelected && (
        <>
          <SelectInput
            items={items}
            onSelect={handleSelect}
            itemComponent={ItemComponent}
            indicatorComponent={IndicatorComponent}
          />

          <Box marginTop={1}>
            <Text color="gray" dimColor>
              Use ↑↓ arrows to navigate, Enter to select, ESC to abort
            </Text>
          </Box>
        </>
      )}

      {hasSelected && (
        <Box marginTop={1}>
          <Text color="green">✓ Selection confirmed</Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Custom item component for select input
 */
const ItemComponent: FC<{
  isSelected?: boolean;
  label: string;
}> = ({ isSelected = false, label }) => {
  const isRequired = label.includes("(REQUIRED)");
  const isFinish = label.toLowerCase().includes("finish");

  let color: "cyan" | "green" | "yellow" | "white" = "white";
  if (isRequired) {
    color = "yellow";
  } else if (isFinish) {
    color = "green";
  } else if (isSelected) {
    color = "cyan";
  }

  return (
    <Box>
      <Text color={color} bold={isSelected || isRequired}>
        {label}
      </Text>
    </Box>
  );
};

/**
 * Custom indicator component (arrow)
 */
const IndicatorComponent: FC<{ isSelected?: boolean }> = ({
  isSelected = false,
}) => {
  return (
    <Box marginRight={1}>
      <Text color={isSelected ? "cyan" : "gray"}>{isSelected ? "›" : " "}</Text>
    </Box>
  );
};
