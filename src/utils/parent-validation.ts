/**
 * Parent Artifact Validation Utilities
 *
 * Provides functions to validate parent artifacts before creating children.
 * Ensures parent exists and is in a ready state for accepting child artifacts.
 */

import {
  ArtifactService,
  type BlockingReason,
  ReadinessService,
} from "@kodebase/artifacts";

export interface ParentValidationResult {
  /** Whether the parent is valid */
  valid: boolean;
  /** Error message (if invalid) */
  error?: string;
  /** Blocking reasons (if not ready) */
  blockingReasons?: BlockingReason[];
  /** Suggested fix for the user */
  suggestion?: string;
}

/**
 * Validate that a parent artifact exists
 *
 * @param parentId - The artifact ID of the parent (e.g., "A", "A.1")
 * @param baseDir - Base directory (defaults to process.cwd())
 * @returns Validation result
 */
export async function validateParentExists(
  parentId: string,
  baseDir?: string,
): Promise<ParentValidationResult> {
  const artifactService = new ArtifactService();

  try {
    await artifactService.getArtifact({ id: parentId, baseDir });
    return { valid: true };
  } catch (_error) {
    return {
      valid: false,
      error: `Parent artifact '${parentId}' not found`,
      suggestion: "Use 'kb status --all' to see available artifacts",
    };
  }
}

/**
 * Validate that a parent artifact is ready (not blocked/completed)
 *
 * @param parentId - The artifact ID of the parent (e.g., "A", "A.1")
 * @param baseDir - Base directory (defaults to process.cwd())
 * @returns Validation result
 */
export async function validateParentReady(
  parentId: string,
  baseDir?: string,
): Promise<ParentValidationResult> {
  const readinessService = new ReadinessService(baseDir);

  const isReady = await readinessService.isReady(parentId);

  if (!isReady) {
    const blockingReasons = await readinessService.getBlockingReasons(parentId);

    return {
      valid: false,
      error: `Parent artifact '${parentId}' is not ready`,
      blockingReasons,
      suggestion: `Complete blocked dependencies before adding children to '${parentId}'`,
    };
  }

  return { valid: true };
}

/**
 * Validate parent artifact (exists + ready)
 *
 * @param parentId - The artifact ID of the parent (e.g., "A", "A.1")
 * @param baseDir - Base directory (defaults to process.cwd())
 * @returns Validation result
 */
export async function validateParent(
  parentId: string,
  baseDir?: string,
): Promise<ParentValidationResult> {
  // First check existence
  const existsResult = await validateParentExists(parentId, baseDir);
  if (!existsResult.valid) {
    return existsResult;
  }

  // Then check readiness
  const readyResult = await validateParentReady(parentId, baseDir);
  if (!readyResult.valid) {
    return readyResult;
  }

  return { valid: true };
}

/**
 * Infer artifact type from parent ID
 *
 * @param parentId - The artifact ID of the parent (undefined for initiative)
 * @returns Artifact type
 */
export function inferArtifactType(
  parentId: string | undefined,
): "initiative" | "milestone" | "issue" {
  if (!parentId) {
    return "initiative";
  }

  // Count dots to determine depth
  // A → milestone
  // A.1 → issue
  // A.1.1 → invalid (issues can't have children)
  const depth = parentId.split(".").length;

  if (depth === 1) {
    return "milestone";
  }

  if (depth === 2) {
    return "issue";
  }

  throw new Error(
    `Invalid parent ID '${parentId}': Issues (depth 3) cannot have children`,
  );
}
