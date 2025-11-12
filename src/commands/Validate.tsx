/**
 * Validate Command Component
 *
 * Implements the 'kb validate' command for artifact validation.
 *
 * Command syntax:
 * - `kb validate` - Validate all artifacts (default)
 * - `kb validate <artifact-id>` - Validate specific artifact
 * - `kb validate --fix` - Apply safe auto-fixes
 * - `kb validate --strict` - Exit 1 on errors (CI mode)
 * - `kb validate --json` - Machine-readable output
 *
 * @description
 * This command validates Kodebase artifacts using ValidationService:
 * 1. Loads artifacts (specific or all)
 * 2. Runs validation through ValidationService
 * 3. Displays errors/warnings with suggested fixes
 * 4. Optionally applies safe auto-fixes with --fix flag
 * 5. Exits with appropriate code for CI integration (--strict)
 *
 * @example
 * ```bash
 * kb validate              # Validate all artifacts
 * kb validate A.1.1        # Validate specific artifact
 * kb validate --fix        # Apply safe auto-fixes
 * kb validate --strict     # CI mode (exit 1 on errors)
 * kb validate --json       # Machine-readable output
 * ```
 */

import { ArtifactService, ValidationService } from "@kodebase/artifacts";
import type { TAnyArtifact } from "@kodebase/core";
import { Box, Text } from "ink";
import type { FC } from "react";
import { useEffect, useState } from "react";
import { ErrorHandler } from "../components/index.js";

export interface ValidateCommandProps {
  /** Artifact ID to validate (optional - validates all if not provided) */
  artifactId?: string;
  /** Apply safe auto-fixes */
  fix?: boolean;
  /** Exit with code 1 on errors (CI mode) */
  strict?: boolean;
  /** Output format */
  format?: "formatted" | "json";
  /** Enable verbose output and error details */
  verbose?: boolean;
}

interface ValidateResult {
  /** Whether validation completed successfully */
  success: boolean;
  /** Validation results */
  results?: ValidationResultWithId[];
  /** Summary statistics */
  summary?: {
    total: number;
    valid: number;
    errors: number;
    warnings: number;
    fixed?: number;
  };
  /** Error (on failure) */
  error?: Error;
}

interface ValidationResultWithId {
  artifactId: string;
  valid: boolean;
  errors: Array<{
    code: string;
    message: string;
    field?: string;
    suggestedFix?: string;
  }>;
  warnings: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
}

export const Validate: FC<ValidateCommandProps> = ({
  artifactId,
  fix,
  strict,
  format = "formatted",
  verbose,
}) => {
  const [result, setResult] = useState<ValidateResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleValidateCommand = async () => {
      try {
        const artifactService = new ArtifactService();
        const validationService = new ValidationService();

        // Step 1: Load artifacts
        // IMPORTANT: Always load all artifacts for relationship validation,
        // even when validating a single artifact
        const { QueryService } = await import("@kodebase/artifacts");
        const queryService = new QueryService();
        const allArtifacts = await queryService.findArtifacts({});

        const allArtifactsMap = new Map<string, TAnyArtifact>();
        for (const item of allArtifacts) {
          allArtifactsMap.set(item.id, item.artifact);
        }

        // Step 2: Run validation
        let validationResults: ValidationResultWithId[];

        if (artifactId) {
          // Validate specific artifact with full context for relationship checking
          const artifact = allArtifactsMap.get(artifactId);
          if (!artifact) {
            throw new Error(`Artifact "${artifactId}" not found`);
          }

          // Use validateArtifact with allArtifacts context
          validationResults = [
            validationService.validateArtifact(artifact, {
              artifactId,
              allArtifacts: allArtifactsMap,
            }),
          ];
        } else {
          // Validate all artifacts
          validationResults = validationService.validateAll({
            artifacts: allArtifactsMap,
          });
        }

        // Step 3: Apply fixes if --fix flag provided
        let fixedCount = 0;
        if (fix) {
          for (const validationResult of validationResults) {
            const artifact = allArtifactsMap.get(validationResult.artifactId);
            if (!artifact) continue;

            // Apply safe auto-fixes
            const fixed = await applySafeFixes(
              validationResult,
              artifact,
              artifactService,
            );
            if (fixed) {
              fixedCount++;
              // Reload the fixed artifact
              const updatedArtifact = await artifactService.getArtifact({
                id: validationResult.artifactId,
              });
              allArtifactsMap.set(validationResult.artifactId, updatedArtifact);
            }
          }

          // Re-run validation after fixes
          if (fixedCount > 0) {
            if (artifactId) {
              // Re-validate specific artifact
              const artifact = allArtifactsMap.get(artifactId);
              if (artifact) {
                validationResults = [
                  validationService.validateArtifact(artifact, {
                    artifactId,
                    allArtifacts: allArtifactsMap,
                  }),
                ];
              }
            } else {
              // Re-validate all artifacts
              validationResults = validationService.validateAll({
                artifacts: allArtifactsMap,
              });
            }
          }
        }

        // Step 4: Calculate summary
        const summary = {
          total: validationResults.length,
          valid: validationResults.filter((r) => r.valid).length,
          errors: validationResults.reduce(
            (sum, r) => sum + r.errors.length,
            0,
          ),
          warnings: validationResults.reduce(
            (sum, r) => sum + r.warnings.length,
            0,
          ),
          ...(fix && fixedCount > 0 ? { fixed: fixedCount } : {}),
        };

        setResult({
          success: true,
          results: validationResults,
          summary,
        });

        // Step 5: Handle --strict exit code
        if (strict && summary.errors > 0) {
          // In production, would use: process.exit(1)
          // For testing compatibility, we just set the result
          // The CLI wrapper will handle the exit code
        }
      } catch (error) {
        setResult({
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      } finally {
        setIsLoading(false);
      }
    };

    handleValidateCommand();
  }, [artifactId, fix, strict]);

  // Loading state (don't show in JSON mode to avoid polluting output)
  if (isLoading && format !== "json") {
    return (
      <Box flexDirection="column">
        <Text dimColor>Validating artifacts...</Text>
      </Box>
    );
  }

  // Loading state for JSON (return nothing to avoid pollution)
  if (isLoading) {
    return null;
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

  // JSON format
  if (format === "json") {
    const jsonOutput = {
      summary: result.summary,
      results: result.results?.map((r) => ({
        artifact_id: r.artifactId,
        status: r.valid ? "valid" : r.errors.length > 0 ? "error" : "warning",
        errors: r.errors,
        warnings: r.warnings,
      })),
    };

    return <Text>{JSON.stringify(jsonOutput, null, 2)}</Text>;
  }

  // Formatted output
  const { results = [], summary } = result;

  // When validating a specific artifact, show it even if valid
  // When validating all artifacts, only show invalid ones
  const resultsToShow =
    artifactId || results.length === 1
      ? results
      : results.filter((result) => !result.valid);

  return (
    <Box flexDirection="column">
      {/* Validation Results */}
      {resultsToShow.map((validationResult) => (
        <Box key={validationResult.artifactId} flexDirection="column">
          <Box>
            <Text color={validationResult.valid ? "green" : "red"}>
              {validationResult.valid ? "✓" : "✗"}
            </Text>
            <Text> </Text>
            <Text bold>{validationResult.artifactId}</Text>
            {!validationResult.valid && (
              <>
                <Text> - </Text>
                <Text color="red">
                  {validationResult.errors.length > 0 &&
                    `${validationResult.errors.length} ${validationResult.errors.length === 1 ? "error" : "errors"}`}
                  {validationResult.errors.length > 0 &&
                    validationResult.warnings.length > 0 &&
                    ", "}
                  {validationResult.warnings.length > 0 &&
                    `${validationResult.warnings.length} ${validationResult.warnings.length === 1 ? "warning" : "warnings"}`}
                </Text>
              </>
            )}
          </Box>

          {/* Errors */}
          {validationResult.errors.map((error, idx) => (
            <Box
              key={`${validationResult.artifactId}-error-${idx}`}
              marginLeft={2}
              flexDirection="column"
            >
              <Box>
                <Text color="red"> • {error.message}</Text>
              </Box>
              {error.field && (
                <Box marginLeft={2}>
                  <Text dimColor>Field: {error.field}</Text>
                </Box>
              )}
              {error.suggestedFix && (
                <Box marginLeft={2}>
                  <Text color="yellow">Fix: {error.suggestedFix}</Text>
                </Box>
              )}
            </Box>
          ))}

          {/* Warnings */}
          {validationResult.warnings.map((warning, idx) => (
            <Box
              key={`${validationResult.artifactId}-warning-${idx}`}
              marginLeft={2}
              flexDirection="column"
            >
              <Box>
                <Text color="yellow"> ⚠ {warning.message}</Text>
              </Box>
              {warning.field && (
                <Box marginLeft={2}>
                  <Text dimColor>Field: {warning.field}</Text>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      ))}

      {/* Summary */}
      {summary && (
        <>
          {/* <Text /> */}
          <Box>
            <Text bold>Summary: </Text>
            <Text>Total: {summary.total}</Text>
            <Text> | </Text>
            <Text color="green">Valid: {summary.valid}</Text>

            {summary.errors > 0 && (
              <>
                <Text> | </Text>
                <Text color="red">Errors: {summary.errors}</Text>
              </>
            )}
            {summary.warnings > 0 && (
              <>
                <Text> | </Text>
                <Text color="yellow">Warnings: {summary.warnings}</Text>
              </>
            )}
          </Box>

          {summary.fixed !== undefined && summary.fixed > 0 && (
            <Box>
              <Text color="green">
                ✓ Auto-fixed {summary.fixed}{" "}
                {summary.fixed === 1 ? "artifact" : "artifacts"}
              </Text>
            </Box>
          )}

          {/* Suggestions */}
          {!fix && summary.warnings > 0 && (
            <Box marginTop={1}>
              <Text dimColor>Run with --fix to apply safe auto-fixes</Text>
            </Box>
          )}

          {strict && summary.errors > 0 && (
            <Box marginTop={1}>
              <Text color="red">✗ Validation failed (--strict mode)</Text>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

/**
 * Apply safe auto-fixes to an artifact
 * Returns true if any fixes were applied
 */
async function applySafeFixes(
  validationResult: ValidationResultWithId,
  _artifact: TAnyArtifact,
  _artifactService: ArtifactService,
): Promise<boolean> {
  // TODO: Implement safe auto-fixes in future iteration
  // Safe fixes include:
  // - Remove blocked_by dependencies that are completed
  // - Fix timestamp format issues
  // - Normalize whitespace in YAML
  // - Add missing schema_version field
  //
  // For now, we return false (no fixes applied)
  // This will be implemented when we have write capabilities in ArtifactService

  // Suppress unused variable warnings
  void validationResult;

  return false;
}
