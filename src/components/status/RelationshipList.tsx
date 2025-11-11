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
  if (blocks.length === 0 && blockedBy.length === 0) {
    return (
      <Box marginTop={1}>
        <Text dimColor>No relationships</Text>
      </Box>
    );
  }

  // Determine if dependencies are resolved based on status
  const isBlocked = currentStatus === "blocked";
  const isCompleted = currentStatus === "completed";
  const isInProgress =
    currentStatus === "in_progress" || currentStatus === "in_review";
  const dependenciesResolved = isCompleted || isInProgress;

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold>Relationships:</Text>

      {blockedBy.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Box flexDirection="row" gap={1}>
            <Text
              color={
                isBlocked ? "red" : dependenciesResolved ? "green" : "gray"
              }
              bold
            >
              {isBlocked ? "Blocked by:" : "Dependencies:"}
            </Text>
            {dependenciesResolved && <Text color="green">✓</Text>}
          </Box>
          {blockedBy.map((id) => (
            <Box key={id} marginLeft={2} marginTop={1}>
              <Text color={dependenciesResolved ? "green" : undefined}>
                • {id} {dependenciesResolved && "(resolved)"}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      {blocks.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="yellow" bold>
            Blocks:
          </Text>
          {blocks.map((id) => (
            <Box key={id} marginLeft={2} marginTop={1}>
              <Text>• {id}</Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};
