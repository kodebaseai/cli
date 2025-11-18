/**
 * Artifact ID and Slug Parser Utilities
 *
 * Handles parsing of artifact IDs and slugs from file paths.
 * Different artifact types have different file naming patterns:
 * - Initiative: A.slug/A.yml
 * - Milestone: A.slug/A.1.slug/A.1.yml
 * - Issue: A.slug/A.1.slug/A.1.1.slug.yml (filename includes slug!)
 */

import path from "node:path";
import { CArtifact, type TArtifactType } from "@kodebase/core";

export interface ParsedArtifact {
  /** Artifact ID (e.g., "F", "F.1", "F.1.1") */
  id: string;
  /** Slug from filename or directory */
  slug: string;
  /** Artifact type based on ID structure */
  type: TArtifactType;
}

/**
 * Parse artifact ID and slug from a file path
 *
 * @param filePath - Absolute or relative path to artifact YAML file
 * @returns Parsed artifact information
 * @throws Error if ID cannot be extracted from filename
 */
export function parseArtifactFromPath(filePath: string): ParsedArtifact {
  // Extract ID and slug from file path
  // File structure:
  // - Initiative: A.slug/A.yml
  // - Milestone: A.slug/A.1.slug/A.1.yml
  // - Issue: A.slug/A.1.slug/A.1.1.slug.yml (filename includes slug!)
  const fileName = path.basename(filePath, ".yml");

  // For issues, the filename is "A.1.1.slug", so we need to extract just "A.1.1"
  // Match the ID pattern: uppercase letter(s) followed by optional .digit segments
  const idMatch = fileName.match(/^([A-Z]+(?:\.\d+)*)(?:\.(.+))?$/);
  if (!idMatch || !idMatch[1]) {
    throw new Error(`Could not extract artifact ID from filename: ${fileName}`);
  }

  const id: string = idMatch[1]; // e.g., "F.1.1"
  const fileSlug: string | undefined = idMatch[2]; // e.g., "submit-button" (from filename)

  // Extract slug from directory name
  const dirName = path.basename(path.dirname(filePath));

  // Determine artifact type from ID to know where to look for slug
  const idSegments = id.split(".");
  const type: TArtifactType =
    idSegments.length === 1
      ? CArtifact.INITIATIVE
      : idSegments.length === 2
        ? CArtifact.MILESTONE
        : CArtifact.ISSUE;

  // Handle slug extraction
  let slug: string;
  if (type === CArtifact.ISSUE) {
    // For issues, slug comes from the filename
    if (fileSlug) {
      slug = fileSlug;
    } else {
      // No slug in filename, look in directory name (shouldn't happen with proper scaffold)
      const parentMilestoneId = idSegments.slice(0, 2).join(".");
      if (dirName.startsWith(`${parentMilestoneId}.`)) {
        slug = id;
      } else {
        slug = dirName;
      }
    }
  } else {
    // For initiatives and milestones, slug comes from directory name
    if (dirName.startsWith(`${id}.`)) {
      slug = dirName.substring(id.length + 1);
    } else {
      slug = dirName;
    }
  }

  return { id, slug, type };
}
