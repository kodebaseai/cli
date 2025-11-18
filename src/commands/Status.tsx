import {
  ArtifactService,
  type QueryCriteria,
  QueryService,
} from "@kodebase/artifacts";
import {
  CArtifactEvent,
  type TAnyArtifact,
  type TArtifactEvent,
} from "@kodebase/core";
import { Box, Text } from "ink";
import type { FC } from "react";
import { useEffect, useState } from "react";
import {
  ErrorHandler,
  EventTimeline,
  RelationshipList,
  StatusBadge,
} from "../components/index.js";
import { createSeparator } from "../utils/index.js";

interface StatusProps {
  /** Artifact ID to display (undefined for --all mode) */
  artifactId?: string;
  /** Display all artifacts */
  all?: boolean;
  /** Output format */
  format?: "formatted" | "json";
  /** Filter by state */
  state?: TArtifactEvent;
  /** Filter by assignee */
  assignee?: string;
  /** Enable verbose output */
  verbose?: boolean;
}

interface LoadedArtifact {
  id: string;
  artifact: TAnyArtifact;
  currentState: TArtifactEvent;
}

/**
 * Status command component - Display artifact status information
 *
 * Modes:
 * - Detailed: kb status A.1.1 - Full artifact details
 * - List: kb status --all - Table view of all artifacts
 * - JSON: kb status --json - Machine-readable output
 */
export const Status: FC<StatusProps> = ({
  artifactId,
  all = false,
  format = "formatted",
  state,
  assignee,
  verbose = false,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [singleArtifact, setSingleArtifact] = useState<LoadedArtifact | null>(
    null,
  );
  const [artifacts, setArtifacts] = useState<LoadedArtifact[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (all) {
          // List mode: load all artifacts with optional filtering
          const queryService = new QueryService();
          const criteria: QueryCriteria = {};

          if (state) {
            criteria.state = state;
          }
          if (assignee) {
            criteria.assignee = assignee;
          }

          const results = await queryService.findArtifacts(criteria);

          const loadedArtifacts: LoadedArtifact[] = results.map((result) => {
            const events = result.artifact.metadata.events || [];
            const currentState: TArtifactEvent =
              events.length > 0
                ? (events[events.length - 1]?.event as TArtifactEvent)
                : CArtifactEvent.DRAFT;

            return {
              id: result.id,
              artifact: result.artifact,
              currentState,
            };
          });

          setArtifacts(loadedArtifacts);
        } else if (artifactId) {
          // Detailed mode: load single artifact
          const artifactService = new ArtifactService();
          const artifact = await artifactService.getArtifact({
            id: artifactId,
          });

          const events = artifact.metadata.events || [];
          const currentState: TArtifactEvent =
            events.length > 0
              ? (events[events.length - 1]?.event as TArtifactEvent)
              : CArtifactEvent.DRAFT;

          setSingleArtifact({
            id: artifactId,
            artifact,
            currentState,
          });
        } else {
          throw new Error("Either artifactId or --all flag must be provided");
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [artifactId, all, state, assignee]);

  // Loading state (skip for JSON mode to avoid polluting output)
  if (loading) {
    if (format === "json") {
      // Return empty fragment - no output during loading for JSON mode
      return null;
    }
    return (
      <Box flexDirection="column">
        <Text dimColor>
          {all ? "Loading artifacts..." : `Loading ${artifactId}...`}
        </Text>
      </Box>
    );
  }

  // Error state
  if (error) {
    return <ErrorHandler error={error} verbose={verbose} />;
  }

  // JSON output mode
  if (format === "json") {
    const jsonOutput = all
      ? {
          artifacts: artifacts.map((a) => ({
            id: a.id,
            title: a.artifact.metadata.title,
            state: a.currentState,
            priority: a.artifact.metadata.priority,
            estimation: a.artifact.metadata.estimation,
            assignee: a.artifact.metadata.assignee,
            relationships: a.artifact.metadata.relationships,
          })),
          total: artifacts.length,
        }
      : singleArtifact
        ? {
            id: singleArtifact.id,
            title: singleArtifact.artifact.metadata.title,
            state: singleArtifact.currentState,
            priority: singleArtifact.artifact.metadata.priority,
            estimation: singleArtifact.artifact.metadata.estimation,
            assignee: singleArtifact.artifact.metadata.assignee,
            relationships: singleArtifact.artifact.metadata.relationships,
            events: singleArtifact.artifact.metadata.events,
          }
        : {};

    // Use console.log for JSON output to avoid Ink's text rendering issues
    console.log(JSON.stringify(jsonOutput, null, 2));
    return null;
  }

  // List mode: formatted table view
  if (all) {
    if (artifacts.length === 0) {
      return (
        <Box flexDirection="column">
          <Text dimColor>No artifacts found</Text>
          {(state || assignee) && (
            <Text dimColor>Try removing filters to see all artifacts</Text>
          )}
        </Box>
      );
    }

    return (
      <Box flexDirection="column">
        <Text bold>Artifacts (Total: {artifacts.length})</Text>
        <Box marginTop={1}>
          <Box width={12}>
            <Text bold>ID</Text>
          </Box>
          <Box width={20}>
            <Text bold>Status</Text>
          </Box>
          <Box width={12}>
            <Text bold>Priority</Text>
          </Box>
          <Box flexGrow={1}>
            <Text bold>Title</Text>
          </Box>
        </Box>
        <Text dimColor>{"─".repeat(80)}</Text>

        {artifacts.map((artifact) => (
          <Box key={artifact.id} marginTop={1}>
            <Box width={12}>
              <Text color="cyan">{artifact.id}</Text>
            </Box>
            <Box width={20}>
              <StatusBadge status={artifact.currentState} />
            </Box>
            <Box width={12}>
              <Text color="magenta">{artifact.artifact.metadata.priority}</Text>
            </Box>
            <Box flexGrow={1}>
              <Text>{artifact.artifact.metadata.title}</Text>
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  // Detailed mode: single artifact view
  if (!singleArtifact) {
    return (
      <ErrorHandler error={new Error("No artifact loaded")} verbose={verbose} />
    );
  }

  const { artifact, currentState } = singleArtifact;
  const separator = createSeparator("━");

  return (
    <Box flexDirection="column">
      {/* Header with separator */}
      <Text>{separator}</Text>
      <Box flexDirection="row" gap={1}>
        <Text bold color="cyan">
          {artifactId}:
        </Text>
        <Text bold>{artifact.metadata.title}</Text>
      </Box>
      <Text>{separator}</Text>

      {/* Summary */}
      {"summary" in artifact.content && artifact.content.summary && (
        <>
          <Text>
            <Text bold>Summary:</Text> {artifact.content.summary}
          </Text>
          <Text>{separator}</Text>
        </>
      )}

      {/* Metadata: Status + Assignee / Priority + Estimation */}
      <Box flexDirection="row">
        <Text dimColor>Status: </Text>
        <StatusBadge status={currentState} />
        <Text>{"     "}</Text>
        <Text dimColor>Assignee: </Text>
        <Text>{artifact.metadata.assignee}</Text>
      </Box>
      <Box flexDirection="row">
        <Text dimColor>Priority: </Text>
        <Text color="magenta" bold>
          {artifact.metadata.priority}
        </Text>
        <Text>{"      "}</Text>
        <Text dimColor>Estimation: </Text>
        <Text bold>{artifact.metadata.estimation}</Text>
      </Box>
      <Text>{separator}</Text>

      {/* Relationships */}
      <RelationshipList
        blocks={artifact.metadata.relationships?.blocks || []}
        blockedBy={artifact.metadata.relationships?.blocked_by || []}
        currentStatus={currentState}
      />
      <Text>{separator}</Text>

      {/* Event Timeline */}
      <EventTimeline
        events={artifact.metadata.events.map((event) => ({
          timestamp: event.timestamp,
          event: event.event,
          actor: event.actor,
          trigger: event.trigger,
        }))}
        maxEvents={5}
      />
      <Text>{separator}</Text>
    </Box>
  );
};
