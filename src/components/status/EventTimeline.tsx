import { Box, Text } from "ink";
import type { FC } from "react";

interface EventTimelineProps {
  events: Array<{
    timestamp: string;
    event: string;
    actor: string;
    trigger?: string;
  }>;
  maxEvents?: number;
}

/**
 * Component for displaying artifact event timeline with icons and color-coded events
 */
export const EventTimeline: FC<EventTimelineProps> = ({
  events,
  maxEvents = 5,
}) => {
  if (events.length === 0) {
    return (
      <Box marginTop={1}>
        <Text dimColor>No events</Text>
      </Box>
    );
  }

  // Sort events by timestamp (newest first) and take the most recent
  const sortedEvents = [...events]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, maxEvents);

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    );

    if (diffHours < 1) {
      return "Just now";
    }
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getEventIcon = (event: string): string => {
    switch (event) {
      case "ready":
      case "completed":
        return "✓";
      case "in_progress":
      case "in_review":
      case "pr_ready":
      case "pr_merged":
      case "branch_created":
        return "→";
      case "blocked":
      case "cancelled":
        return "⚠";
      case "draft":
      case "artifact_created":
        return "⊙";
      default:
        return "•";
    }
  };

  const getEventColor = (event: string): string => {
    switch (event) {
      case "draft":
      case "artifact_created":
        return "gray";
      case "ready":
      case "completed":
        return "green";
      case "in_progress":
      case "branch_created":
        return "yellow";
      case "in_review":
      case "pr_ready":
        return "blue";
      case "blocked":
      case "cancelled":
        return "red";
      case "archived":
        return "gray";
      default:
        return "white";
    }
  };

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold>Event History:</Text>
      {sortedEvents.map((eventItem, index) => (
        <Box key={`${eventItem.timestamp}-${index}`} marginTop={1}>
          <Box flexDirection="row" gap={1}>
            <Text color={getEventColor(eventItem.event)}>
              {getEventIcon(eventItem.event)}
            </Text>
            <Box width={15}>
              <Text color={getEventColor(eventItem.event)} bold>
                {eventItem.event}
              </Text>
            </Box>
            <Box width={15}>
              <Text dimColor>{formatTimestamp(eventItem.timestamp)}</Text>
            </Box>
            <Box>
              <Text dimColor>{eventItem.actor}</Text>
            </Box>
            {eventItem.trigger && <Text dimColor> ({eventItem.trigger})</Text>}
          </Box>
        </Box>
      ))}
    </Box>
  );
};
