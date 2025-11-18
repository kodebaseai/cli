import { CArtifactEvent, CEventTrigger } from "@kodebase/core";
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
  /** Optional current time for testing (defaults to Date.now()) */
  currentTime?: Date;
}

/**
 * Component for displaying artifact event timeline with icons and color-coded events
 */
export const EventTimeline: FC<EventTimelineProps> = ({
  events,
  maxEvents = 5,
  currentTime,
}) => {
  if (events.length === 0) {
    return (
      <Box marginTop={1}>
        <Text dimColor>No events</Text>
      </Box>
    );
  }

  // Define event order for stable sorting when timestamps are equal
  const eventOrder: Record<string, number> = {
    draft: 0,
    artifact_created: 1,
    ready: 2,
    blocked: 3,
    in_progress: 4,
    branch_created: 5,
    in_review: 6,
    pr_ready: 7,
    pr_merged: 8,
    completed: 9,
    cancelled: 10,
    archived: 11,
  };

  // Sort events by timestamp (newest first), with stable ordering for equal timestamps
  const sortedEvents = [...events]
    .sort((a, b) => {
      const timeDiff =
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      // If timestamps are equal, use event order (draft always first/bottom)
      if (timeDiff === 0) {
        const orderA = eventOrder[a.event] ?? 99;
        const orderB = eventOrder[b.event] ?? 99;
        return orderA - orderB;
      }
      return timeDiff;
    })
    .slice(0, maxEvents);

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = currentTime ?? new Date();
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
      case CArtifactEvent.DRAFT:
      case CEventTrigger.ARTIFACT_CREATED:
        return "◌";
      case CArtifactEvent.READY:
        return "○";
      case CArtifactEvent.IN_PROGRESS:
      case CEventTrigger.BRANCH_CREATED:
        return "◎";
      case CArtifactEvent.IN_REVIEW:
      case CEventTrigger.PR_READY:
        return "♾";
      case CArtifactEvent.COMPLETED:
      case CEventTrigger.PR_MERGED:
        return "●";
      case CArtifactEvent.BLOCKED:
        return "◇";
      case CArtifactEvent.CANCELLED:
        return "◈";
      case CArtifactEvent.ARCHIVED:
        return "◆";
      default:
        return "•";
    }
  };

  const getEventColor = (event: string): string => {
    switch (event) {
      case CArtifactEvent.DRAFT:
        return "gray";
      case CArtifactEvent.READY:
      case CArtifactEvent.COMPLETED:
        return "green";
      case CArtifactEvent.IN_PROGRESS:
      case CEventTrigger.BRANCH_CREATED:
        return "yellow";
      case CArtifactEvent.IN_REVIEW:
      case CEventTrigger.PR_READY:
        return "blue";
      case CArtifactEvent.BLOCKED:
      case CArtifactEvent.CANCELLED:
        return "red";
      case CArtifactEvent.ARCHIVED:
        return "gray";
      default:
        return "white";
    }
  };

  return (
    <Box flexDirection="column">
      <Text bold>Event History:</Text>
      {sortedEvents.map((eventItem, index) => (
        <Box key={`${eventItem.timestamp}-${index}`}>
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
          </Box>
        </Box>
      ))}
    </Box>
  );
};
