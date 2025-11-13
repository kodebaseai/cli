/**
 * Artifact loading and summary utilities for CLI components
 *
 * Provides functions for loading artifacts from the file system and
 * creating summary objects for display in UI components.
 */

import {
  getArtifactIdFromPath,
  loadAllArtifactPaths,
  parseInitiative,
  parseIssue,
  parseMilestone,
  readArtifact,
  type TInitiative,
  type TIssue,
  type TMilestone,
} from "@kodebase/core";

/**
 * Interface for artifact summary used in list display
 */
export interface ArtifactSummary {
  id: string;
  title: string;
  type: "initiative" | "milestone" | "issue";
  status: string;
  assignee: string;
  level: number; // For hierarchical display (0=initiative, 1=milestone, 2=issue)
}

/**
 * Determine artifact type based on ID format
 */
function getArtifactType(
  artifactId: string,
): "initiative" | "milestone" | "issue" {
  const parts = artifactId.split(".");

  if (parts.length === 1) return "initiative";
  if (parts.length === 2) return "milestone";
  if (parts.length === 3) return "issue";

  throw new Error(`Invalid artifact ID format: ${artifactId}`);
}

/**
 * Get the latest status from artifact events
 */
function getLatestStatus(
  events: Array<{ event: string; timestamp: string }>,
): string {
  if (events.length === 0) return "draft";

  // Sort events by timestamp (newest first) and get the latest event
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return sortedEvents[0]?.event || "draft";
}

/**
 * Parse an artifact from file content based on its type
 */
async function parseArtifactByType(
  content: string | Record<string, unknown>,
  type: "initiative" | "milestone" | "issue",
): Promise<TInitiative | TMilestone | TIssue> {
  switch (type) {
    case "initiative": {
      const result = parseInitiative(content);
      if (!result.success) {
        throw new Error(`Failed to parse initiative: ${result.error.message}`);
      }
      return result.data;
    }
    case "milestone": {
      const result = parseMilestone(content);
      if (!result.success) {
        throw new Error(`Failed to parse milestone: ${result.error.message}`);
      }
      return result.data;
    }
    case "issue": {
      const result = parseIssue(content);
      if (!result.success) {
        throw new Error(`Failed to parse issue: ${result.error.message}`);
      }
      return result.data;
    }
  }
}

/**
 * Load all artifacts from the filesystem and return summaries
 */
export async function loadAllArtifactSummaries(
  artifactsRoot = ".kodebase/artifacts",
): Promise<ArtifactSummary[]> {
  const summaries: ArtifactSummary[] = [];

  try {
    const allPaths = await loadAllArtifactPaths(artifactsRoot);

    for (const filePath of allPaths) {
      const artifactId = getArtifactIdFromPath(filePath);
      if (!artifactId) continue;

      try {
        const type = getArtifactType(artifactId);
        const content = await readArtifact<Record<string, unknown>>(filePath);
        const artifact = await parseArtifactByType(content, type);

        const level = type === "initiative" ? 0 : type === "milestone" ? 1 : 2;

        summaries.push({
          id: artifactId,
          title: artifact.metadata.title,
          type,
          status: getLatestStatus(artifact.metadata.events),
          assignee: artifact.metadata.assignee || "Unassigned",
          level,
        });
      } catch (error) {
        // Skip artifacts that fail to parse
        console.error(
          `Failed to load artifact ${artifactId}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  } catch (error) {
    throw new Error(
      `Failed to load artifacts: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  return summaries;
}
