/**
 * Integration wrapper for @kodebase/core
 *
 * Re-exports commonly used types and utilities from the core package
 * for convenient access throughout the CLI.
 */

export type {
  TArtifactEvent as ArtifactState,
  TArtifactType as ArtifactType,
  TEstimationSize as EstimationSize,
  TPriority as Priority,
} from "@kodebase/core";

// Re-export core utilities as they become available
// export { ... } from '@kodebase/core';
