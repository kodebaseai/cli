import { Box, Text } from "ink";
import type { FC } from "react";

interface RelationshipListProps {
  blocks: string[];
  blockedBy: string[];
  currentStatus?: string;
}

/**
 * Component for displaying artifact relationships (blocks/blocked_by)
 * with status indicators and dependency resolution state
 */
export const RelationshipList: FC<RelationshipListProps> = ({
  blocks,
  blockedBy,
  currentStatus,
}) => {
  // Determine if dependencies are resolved based on status
  const isBlocked = currentStatus === "blocked";
  const isCompleted = currentStatus === "completed";
  const isInProgress =
    currentStatus === "in_progress" || currentStatus === "in_review";
  const dependenciesResolved = isCompleted || isInProgress;

  return (
    <Box flexDirection="column">
      {blockedBy.length > 0 && (
        <Box flexDirection="row" gap={1}>
          <Text>{isBlocked ? "Blocked by:" : "Dependencies"}</Text>
          {blockedBy.map((id, index) => (
            <Text key={id} color={dependenciesResolved ? "green" : "red"}>
              {dependenciesResolved ? "✓" : "✗"} {id}
              {index < blockedBy.length - 1 ? "," : ""}
            </Text>
          ))}
        </Box>
      )}

      {blocks.length > 0 && (
        <Box flexDirection="row">
          <Text>Blocks: {blocks.join(", ")}</Text>
        </Box>
      )}
    </Box>
  );
};
