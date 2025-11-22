/**
 * PR Template Generator
 *
 * Generates Pull Request descriptions from artifact metadata and implementation notes.
 */

import type { TIssue } from "@kodebase/core";

export interface PRTemplateOptions {
  /** Artifact ID (e.g., "E.2.3") */
  artifactId: string;
  /** Artifact metadata */
  artifact: TIssue;
}

/**
 * Generate a PR description from artifact data
 *
 * Template structure:
 * - Summary
 * - Implementation notes (if available)
 * - Acceptance criteria
 * - Testing checklist
 */
export function generatePRDescription(options: PRTemplateOptions): string {
  const { artifactId, artifact } = options;
  const { content, implementation_notes } = artifact;
  const parts: string[] = [];

  // Header
  parts.push(`## ${artifactId}: ${artifact.metadata.title}`);
  parts.push("");

  // Summary
  if (content.summary) {
    parts.push("### Summary");
    parts.push("");
    parts.push(content.summary);
    parts.push("");
  }

  // Implementation Notes (if present)
  if (implementation_notes) {
    parts.push("### Implementation");
    parts.push("");

    // Results
    if (implementation_notes.result) {
      parts.push(`**Result:** ${implementation_notes.result}`);
      parts.push("");
    }

    // Tags
    if (implementation_notes.tags && implementation_notes.tags.length > 0) {
      parts.push(
        `**Tags:** ${implementation_notes.tags.map((t) => `\`${t}\``).join(", ")}`,
      );
      parts.push("");
    }

    // Challenges
    if (
      implementation_notes.challenges &&
      implementation_notes.challenges.length > 0
    ) {
      parts.push("**Challenges & Solutions:**");
      parts.push("");
      for (const { challenge, solution } of implementation_notes.challenges) {
        parts.push(`- **Challenge:** ${challenge}`);
        parts.push(`  - **Solution:** ${solution}`);
      }
      parts.push("");
    }

    // Insights
    if (
      implementation_notes.insights &&
      implementation_notes.insights.length > 0
    ) {
      parts.push("**Key Insights:**");
      parts.push("");
      for (const insight of implementation_notes.insights) {
        parts.push(`- ${insight}`);
      }
      parts.push("");
    }
  }

  // Acceptance Criteria
  if (content.acceptance_criteria && content.acceptance_criteria.length > 0) {
    parts.push("### Acceptance Criteria");
    parts.push("");
    for (const criterion of content.acceptance_criteria) {
      parts.push(`- [x] ${criterion}`);
    }
    parts.push("");
  }

  // Footer
  parts.push("---");
  parts.push(`*Generated from artifact ${artifactId}*`);

  return parts.join("\n");
}

/**
 * Check if PR description is still the default "work in progress" message
 */
export function isDefaultPRDescription(
  description: string | undefined,
): boolean {
  if (!description) return true;

  const trimmed = description.trim().toLowerCase();

  // Check for common default messages
  const defaultPatterns = [
    /^work in progress/i,
    /^🚧\s*work in progress/i,
    /^wip/i,
    /^draft/i,
  ];

  return defaultPatterns.some((pattern) => pattern.test(trimmed));
}
