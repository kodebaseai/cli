import { CArtifactEvent } from "@kodebase/core";
import { Text } from "ink";
import type { FC } from "react";

interface StatusBadgeProps {
  status: string;
}

/**
 * Status badge component for displaying artifact status with color coding
 */
export const StatusBadge: FC<StatusBadgeProps> = ({ status }) => {
  const getStatusColor = (status: string): string => {
    switch (status) {
      case CArtifactEvent.READY:
        return "green";
      case CArtifactEvent.IN_PROGRESS:
        return "yellow";
      case CArtifactEvent.IN_REVIEW:
        return "blue";
      case CArtifactEvent.COMPLETED:
        return "green";
      case CArtifactEvent.BLOCKED:
        return "red";
      case CArtifactEvent.CANCELLED:
        return "gray";
      case CArtifactEvent.ARCHIVED:
        return "gray";
      case CArtifactEvent.DRAFT:
        return "gray";
      default:
        return "white";
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case CArtifactEvent.IN_PROGRESS:
        return "In Progress";
      case CArtifactEvent.IN_REVIEW:
        return "In Review";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  return (
    <Text color={getStatusColor(status)} bold>
      {getStatusLabel(status)}
    </Text>
  );
};
