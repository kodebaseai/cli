/**
 * Context Command Component
 *
 * Implements the 'kb ctx' command for on-demand AI context generation.
 *
 * Command syntax:
 * - `kb ctx <artifact-id>` - Generate standard context
 * - `kb ctx <artifact-id> --format compact` - Minimal context
 * - `kb ctx <artifact-id> --format detailed` - Full hierarchy with relationships
 * - `kb ctx <artifact-id> --copy` - Copy to clipboard
 * - `kb ctx <artifact-id> --output file.md` - Save to file
 *
 * @description
 * This command generates AI-ready context from artifacts with multiple output formats:
 * 1. Loads the specified artifact
 * 2. Generates context based on selected format
 * 3. Optionally copies to clipboard with --copy flag
 * 4. Optionally saves to file with --output flag
 * 5. Displays formatted output to console
 *
 * @example
 * ```bash
 * kb ctx A.1.1                    # Standard format
 * kb ctx A.1.1 --format compact   # Minimal context
 * kb ctx A.1.1 --format detailed  # Full hierarchy
 * kb ctx A.1.1 --copy             # Copy to clipboard
 * kb ctx A.1.1 --output ctx.md    # Save to file
 * ```
 */

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { QueryService } from "@kodebase/artifacts";
import type { TAnyArtifact } from "@kodebase/core";
import { Box, Text } from "ink";
import type { FC } from "react";
import { useEffect, useState } from "react";
import { ErrorHandler } from "../components/index.js";

export interface ContextCommandProps {
  /** Artifact ID to generate context for (e.g., 'A.1.1') */
  artifactId: string;
  /** Output format: standard (default), compact, detailed */
  format?: "standard" | "compact" | "detailed";
  /** Copy to clipboard */
  copy?: boolean;
  /** Output file path */
  output?: string;
  /** Enable verbose output and error details */
  verbose?: boolean;
}

interface ContextResult {
  /** Whether the context generation completed successfully */
  success: boolean;
  /** Generated context string */
  context?: string;
  /** Whether context was copied to clipboard */
  copied?: boolean;
  /** Whether user requested clipboard copy */
  copyRequested?: boolean;
  /** Output file path (if saved) */
  outputPath?: string;
  /** Error (on failure) */
  error?: Error;
}

export const Context: FC<ContextCommandProps> = ({
  artifactId,
  format = "standard",
  copy = false,
  output,
  verbose,
}) => {
  const [result, setResult] = useState<ContextResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleContextCommand = async () => {
      try {
        const queryService = new QueryService();

        // Step 1: Load the artifact
        const results = await queryService.findArtifacts({});
        const artifactWithId = results.find((a) => a.id === artifactId);

        if (!artifactWithId) {
          throw new Error(`Artifact ${artifactId} not found`);
        }

        const { artifact } = artifactWithId;

        // Step 2: Generate context based on format
        let context: string;
        switch (format) {
          case "compact":
            context = await generateCompactContext(
              artifactId,
              artifact,
              queryService,
            );
            break;
          case "detailed":
            context = await generateDetailedContext(
              artifactId,
              artifact,
              queryService,
            );
            break;
          default:
            context = await generateStandardContext(
              artifactId,
              artifact,
              queryService,
            );
            break;
        }

        // Step 3: Copy to clipboard if --copy flag provided
        let copied = false;
        if (copy) {
          try {
            // Dynamic import to avoid loading clipboardy in CI/headless environments
            const clipboardy = await import("clipboardy");
            await clipboardy.default.write(context);
            copied = true;
          } catch {
            // Clipboard may not be available in headless/CI environments
            // Continue without copying - user will still see context output
            copied = false;
          }
        }

        // Step 4: Save to file if --output flag provided
        let outputPath: string | undefined;
        if (output) {
          const absolutePath = resolve(process.cwd(), output);
          await writeFile(absolutePath, context, "utf-8");
          outputPath = absolutePath;
        }

        setResult({
          success: true,
          context,
          copied,
          copyRequested: copy,
          outputPath,
        });
      } catch (error) {
        setResult({
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      } finally {
        setIsLoading(false);
      }
    };

    handleContextCommand();
  }, [artifactId, format, copy, output]);

  // Loading state
  if (isLoading) {
    return (
      <Box flexDirection="column">
        <Text dimColor>Generating context...</Text>
      </Box>
    );
  }

  // No result (shouldn't happen)
  if (!result) {
    return (
      <ErrorHandler
        error={new Error("Unexpected error occurred")}
        verbose={verbose}
      />
    );
  }

  // Error state
  if (!result.success) {
    return (
      <ErrorHandler
        error={result.error ?? new Error("Unknown error")}
        verbose={verbose}
      />
    );
  }

  // Success state
  return (
    <Box flexDirection="column">
      {/* Display the context */}
      <Text>{result.context}</Text>

      {/* Success messages */}
      {result.copied && (
        <Box marginTop={1}>
          <Text color="green">✓ Context copied to clipboard</Text>
        </Box>
      )}

      {result.outputPath && (
        <Box marginTop={1}>
          <Text color="green">✓ Context saved to {result.outputPath}</Text>
        </Box>
      )}

      {/* Empty line at end to prevent shell % indicator */}
      <Text />
    </Box>
  );
};

/**
 * Generate standard context format
 * Includes: artifact + parent context
 */
async function generateStandardContext(
  artifactId: string,
  artifact: TAnyArtifact,
  queryService: QueryService,
): Promise<string> {
  const parts: string[] = [];

  // Header
  parts.push(`# Artifact ${artifactId}: ${artifact.metadata.title}`);
  parts.push("");

  // Parent Context
  const ancestors = await queryService.getAncestors(artifactId);
  if (ancestors.length > 0) {
    parts.push("## Parent Context");
    parts.push("");

    for (const ancestor of ancestors) {
      const ancestorLevel = ancestor.id.split(".").length;
      const levelName =
        ancestorLevel === 1
          ? "Initiative"
          : ancestorLevel === 2
            ? "Milestone"
            : "Issue";

      parts.push(
        `**${levelName} ${ancestor.id}:** ${ancestor.artifact.metadata.title}`,
      );

      // Add summary if available
      const summary = getArtifactSummary(ancestor.artifact);
      if (summary) {
        parts.push(summary);
      }
      parts.push("");
    }
  }

  // Description/Summary
  const summary = getArtifactSummary(artifact);
  if (summary) {
    parts.push("## Description");
    parts.push("");
    parts.push(summary);
    parts.push("");
  }

  // Acceptance Criteria / Success Criteria
  const criteria = getArtifactCriteria(artifact);
  if (criteria.length > 0) {
    const criteriaTitle = getCriteriaTitle(artifact);
    parts.push(`## ${criteriaTitle}`);
    parts.push("");
    for (const criterion of criteria) {
      parts.push(`- ${criterion}`);
    }
    parts.push("");
  }

  // Relationships
  const { blocks = [], blocked_by = [] } =
    artifact.metadata.relationships || {};

  if (blocked_by.length > 0 || blocks.length > 0) {
    parts.push("## Relationships");
    parts.push("");

    if (blocked_by.length > 0) {
      parts.push("**Dependencies (blocked by):**");
      for (const dep of blocked_by) {
        parts.push(`- ${dep}`);
      }
      parts.push("");
    }

    if (blocks.length > 0) {
      parts.push("**Blocks:**");
      for (const dep of blocks) {
        parts.push(`- ${dep}`);
      }
      parts.push("");
    }
  }

  // Metadata
  parts.push("## Metadata");
  parts.push("");
  parts.push(`- **Priority:** ${artifact.metadata.priority}`);
  parts.push(`- **Estimation:** ${artifact.metadata.estimation}`);
  if (artifact.metadata.assignee) {
    parts.push(`- **Assignee:** ${artifact.metadata.assignee}`);
  }
  parts.push("");

  // Footer
  parts.push("---");
  parts.push("*Context generated by Kodebase CLI*");

  return parts.join("\n");
}

/**
 * Generate compact context format
 * Minimal - just artifact essentials
 */
async function generateCompactContext(
  artifactId: string,
  artifact: TAnyArtifact,
  _queryService: QueryService,
): Promise<string> {
  const parts: string[] = [];

  // Header
  parts.push(`# ${artifactId}: ${artifact.metadata.title}`);
  parts.push("");

  // Summary (if available)
  const summary = getArtifactSummary(artifact);
  if (summary) {
    parts.push(summary);
    parts.push("");
  }

  // Criteria
  const criteria = getArtifactCriteria(artifact);
  if (criteria.length > 0) {
    parts.push("**Criteria:**");
    for (const criterion of criteria) {
      parts.push(`- ${criterion}`);
    }
    parts.push("");
  }

  return parts.join("\n");
}

/**
 * Generate detailed context format
 * Includes full parent hierarchy and relationships
 */
async function generateDetailedContext(
  artifactId: string,
  artifact: TAnyArtifact,
  queryService: QueryService,
): Promise<string> {
  const parts: string[] = [];

  // Header
  parts.push(`# Artifact ${artifactId}: ${artifact.metadata.title}`);
  parts.push("");

  // Full Parent Hierarchy
  const ancestors = await queryService.getAncestors(artifactId);
  if (ancestors.length > 0) {
    parts.push("## Parent Hierarchy");
    parts.push("");

    for (const ancestor of ancestors) {
      const ancestorLevel = ancestor.id.split(".").length;
      const levelName =
        ancestorLevel === 1
          ? "Initiative"
          : ancestorLevel === 2
            ? "Milestone"
            : "Issue";

      parts.push(`### ${levelName} ${ancestor.id}`);
      parts.push("");
      parts.push(`**Title:** ${ancestor.artifact.metadata.title}`);
      parts.push("");

      // Add full summary
      const summary = getArtifactSummary(ancestor.artifact);
      if (summary) {
        parts.push("**Description:**");
        parts.push(summary);
        parts.push("");
      }

      // Add criteria
      const criteria = getArtifactCriteria(ancestor.artifact);
      if (criteria.length > 0) {
        const criteriaTitle = getCriteriaTitle(ancestor.artifact);
        parts.push(`**${criteriaTitle}:**`);
        for (const criterion of criteria) {
          parts.push(`- ${criterion}`);
        }
        parts.push("");
      }

      // Add metadata
      parts.push(
        `**Priority:** ${ancestor.artifact.metadata.priority} | **Estimation:** ${ancestor.artifact.metadata.estimation}`,
      );
      parts.push("");
    }
  }

  // Current Artifact Details
  parts.push("## Current Artifact");
  parts.push("");

  // Description/Summary
  const summary = getArtifactSummary(artifact);
  if (summary) {
    parts.push("**Description:**");
    parts.push(summary);
    parts.push("");
  }

  // Acceptance Criteria / Success Criteria
  const criteria = getArtifactCriteria(artifact);
  if (criteria.length > 0) {
    const criteriaTitle = getCriteriaTitle(artifact);
    parts.push(`**${criteriaTitle}:**`);
    for (const criterion of criteria) {
      parts.push(`- ${criterion}`);
    }
    parts.push("");
  }

  // Full Relationships with Details
  const { blocks = [], blocked_by = [] } =
    artifact.metadata.relationships || {};

  if (blocked_by.length > 0 || blocks.length > 0) {
    parts.push("## Relationships");
    parts.push("");

    if (blocked_by.length > 0) {
      parts.push("### Dependencies (blocked by)");
      for (const dep of blocked_by) {
        // Try to get details about the dependency
        const depResults = await queryService.findArtifacts({});
        const depArtifact = depResults.find((a) => a.id === dep);
        if (depArtifact) {
          parts.push(`- **${dep}:** ${depArtifact.artifact.metadata.title}`);
        } else {
          parts.push(`- ${dep}`);
        }
      }
      parts.push("");
    }

    if (blocks.length > 0) {
      parts.push("### Blocks");
      for (const dep of blocks) {
        // Try to get details about what this blocks
        const depResults = await queryService.findArtifacts({});
        const depArtifact = depResults.find((a) => a.id === dep);
        if (depArtifact) {
          parts.push(`- **${dep}:** ${depArtifact.artifact.metadata.title}`);
        } else {
          parts.push(`- ${dep}`);
        }
      }
      parts.push("");
    }
  }

  // Extended Metadata
  parts.push("## Metadata");
  parts.push("");
  parts.push(`- **Priority:** ${artifact.metadata.priority}`);
  parts.push(`- **Estimation:** ${artifact.metadata.estimation}`);
  if (artifact.metadata.assignee) {
    parts.push(`- **Assignee:** ${artifact.metadata.assignee}`);
  }
  parts.push(`- **Created By:** ${artifact.metadata.created_by}`);
  if (artifact.metadata.schema_version) {
    parts.push(`- **Schema Version:** ${artifact.metadata.schema_version}`);
  }
  parts.push("");

  // Events (if available)
  if (artifact.metadata.events && artifact.metadata.events.length > 0) {
    parts.push("### Recent Events");
    const recentEvents = artifact.metadata.events.slice(-3); // Last 3 events
    for (const event of recentEvents) {
      parts.push(
        `- **${event.event}** (${event.timestamp}) - ${event.trigger}`,
      );
    }
    parts.push("");
  }

  // Footer
  parts.push("---");
  parts.push("*Detailed context generated by Kodebase CLI*");

  return parts.join("\n");
}

/**
 * Get the summary/description from an artifact based on its type
 */
function getArtifactSummary(artifact: TAnyArtifact): string | undefined {
  const content = artifact.content;

  if ("summary" in content && content.summary) {
    return content.summary;
  }

  if ("vision" in content && content.vision) {
    return content.vision;
  }

  return undefined;
}

/**
 * Get acceptance/success criteria from an artifact based on its type
 */
function getArtifactCriteria(artifact: TAnyArtifact): string[] {
  const content = artifact.content;

  // Issue: acceptance_criteria
  if ("acceptance_criteria" in content && content.acceptance_criteria) {
    return Array.isArray(content.acceptance_criteria)
      ? content.acceptance_criteria
      : [content.acceptance_criteria];
  }

  // Milestone: validation
  if ("validation" in content && content.validation) {
    return Array.isArray(content.validation)
      ? content.validation
      : [content.validation];
  }

  // Initiative: success_criteria
  if ("success_criteria" in content && content.success_criteria) {
    return Array.isArray(content.success_criteria)
      ? content.success_criteria
      : [content.success_criteria];
  }

  return [];
}

/**
 * Get the appropriate criteria title based on artifact type
 */
function getCriteriaTitle(artifact: TAnyArtifact): string {
  const content = artifact.content;

  if ("acceptance_criteria" in content) {
    return "Acceptance Criteria";
  }

  if ("validation" in content) {
    return "Validation Criteria";
  }

  if ("success_criteria" in content) {
    return "Success Criteria";
  }

  return "Criteria";
}
