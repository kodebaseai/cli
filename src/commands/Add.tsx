/**
 * Add Command Component
 *
 * Implements the 'kb add' command for creating new artifacts.
 *
 * Command syntax:
 * - `kb add` - Launch interactive wizard (initiative)
 * - `kb add --wizard` - Launch interactive wizard (explicit)
 * - `kb add A` - Launch wizard with parent A pre-filled
 * - `kb add "Title"` - Direct mode: Create initiative
 * - `kb add A "Title"` - Direct mode: Create milestone under A
 * - `kb add A.1 "Title"` - Direct mode: Create issue under A.1
 * - `kb add --submit` - Run full validation and create PR
 *
 * @description
 * This command automates the process of creating Kodebase artifacts by:
 * 1. Determining creation mode (wizard vs direct)
 * 2. For wizard mode: Launching AI-assisted interactive wizard
 * 3. For direct mode: Creating artifact with defaults and AI prompt
 * 4. Validating parent artifact exists and is ready
 * 5. Creating artifact file via ArtifactService
 * 6. Enforcing hierarchy validation (initiative→milestone→issue)
 * 7. Batch creation loop until hierarchy is valid
 * 8. Optionally creating PR with --submit flag
 *
 * @example
 * ```bash
 * kb add                       # Wizard mode (initiative)
 * kb add A                     # Wizard mode (milestone under A)
 * kb add "OAuth Integration"   # Direct mode (initiative)
 * kb add A "Payment System"    # Direct mode (milestone)
 * kb add A.1 "Stripe setup"    # Direct mode (issue)
 * ```
 */

import path from "node:path";
import {
  ArtifactService,
  IdAllocationService,
  ScaffoldingService,
} from "@kodebase/artifacts";
import {
  CArtifact,
  CEstimationSize,
  CPriority,
  type TAnyArtifact,
} from "@kodebase/core";
import { Box, Text } from "ink";
import type { FC } from "react";
import { useCallback, useEffect, useState } from "react";
import { ErrorHandler, HierarchyValidationMenu } from "../components/index.js";
import {
  type WizardCompletionResult,
  WizardFlow,
} from "../components/wizard/index.js";
import type {
  BatchCreationContext,
  HierarchyValidationResult,
  NextStepAction,
} from "../components/wizard/types.js";
import { HierarchyValidationService } from "../services/index.js";
import { validateGitStatus } from "../utils/git-branch.js";
import { inferArtifactType, validateParent } from "../utils/index.js";

export interface AddCommandProps {
  /** CLI arguments (can be empty, parent ID, or parent+title) */
  args: string[];
  /** Enable verbose output and error details */
  verbose?: boolean;
  /** Submit PR after creation and validation */
  submit?: boolean;
}

interface AddResult {
  /** Whether the add operation completed successfully */
  success: boolean;
  /** User-facing message to display */
  message: string;
  /** Created artifact ID (on success) */
  artifactId?: string;
  /** Created artifact file path (on success) */
  filePath?: string;
  /** PR URL (if --submit used) */
  prUrl?: string;
  /** Error (on failure) */
  error?: Error;
  /** Validation errors (if validation failed) */
  validationErrors?: string[];
}

/**
 * Determine operation mode from arguments
 */
function detectMode(args: string[]): {
  mode: "wizard" | "direct";
  parentId?: string;
  title?: string;
} {
  // Remove flags from args
  const nonFlagArgs = args.filter((arg) => !arg.startsWith("--"));

  // No arguments → wizard mode
  if (nonFlagArgs.length === 0) {
    return { mode: "wizard" };
  }

  // One argument: Could be parent (wizard) or title (direct)
  if (nonFlagArgs.length === 1) {
    const arg = nonFlagArgs[0];
    if (!arg) {
      return { mode: "wizard" };
    }

    // Check if it looks like an artifact ID (A, A.1, A.1.1)
    const artifactIdPattern = /^[A-Z](\.\d+)*$/;
    if (artifactIdPattern.test(arg)) {
      // Parent ID → wizard mode with pre-filled parent
      return { mode: "wizard", parentId: arg };
    }

    // Otherwise it's a title → direct mode (initiative)
    return { mode: "direct", title: arg };
  }

  // Two+ arguments: parent + title → direct mode
  const parentId = nonFlagArgs[0];
  if (!parentId) {
    return { mode: "wizard" };
  }
  const title = nonFlagArgs.slice(1).join(" ");
  return { mode: "direct", parentId, title };
}

export const Add: FC<AddCommandProps> = ({ args, verbose, submit }) => {
  const [result, setResult] = useState<AddResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardProps, setWizardProps] = useState<{
    parentId?: string;
    artifactType?: string;
  }>({});
  const [progressMessage, setProgressMessage] = useState<string | null>(null);

  // Batch creation state
  const [batchContext, setBatchContext] = useState<BatchCreationContext | null>(
    null,
  );
  const [hierarchyValidation, setHierarchyValidation] =
    useState<HierarchyValidationResult | null>(null);
  const [createdFilePaths, setCreatedFilePaths] = useState<string[]>([]);

  // Handle submission (validation + PR creation)
  const handleSubmit = useCallback(async () => {
    if (!batchContext) return;

    setIsLoading(true);
    setProgressMessage("Running full validation...");

    try {
      const { ValidationService } = await import("@kodebase/artifacts");
      const baseDir = process.cwd();
      const artifactService = new ArtifactService();
      const validationService = new ValidationService();

      // Fetch all created artifacts
      const artifacts = await Promise.all(
        batchContext.createdArtifacts.map((id) =>
          artifactService.getArtifact({ id, baseDir }),
        ),
      );

      // Validate all created artifacts
      const validationResults = artifacts.map((artifact, index) => {
        const id = batchContext.createdArtifacts[index];
        if (!id) {
          throw new Error("Missing artifact ID during validation");
        }
        return validationService.validateArtifact(artifact, {
          artifactId: id,
        });
      });

      // Check for validation errors
      const errors = validationResults.filter((r) => !r.valid);
      if (errors.length > 0) {
        const errorMessages = errors
          .map(
            (e) =>
              `${e.artifactId}: ${e.errors.map((err) => err.message).join(", ")}`,
          )
          .join("\n");

        setResult({
          success: false,
          message: `Validation failed for ${errors.length} artifact(s):\n${errorMessages}`,
          validationErrors: errors.flatMap((e) =>
            e.errors.map((err) => err.message),
          ),
        });
        return;
      }

      // All artifacts valid - create PR
      setProgressMessage("Creating pull request...");

      const { execSync } = await import("node:child_process");

      // Get current branch name
      const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
        encoding: "utf8",
      }).trim();

      // Stage and commit all created artifacts
      execSync("git add .kodebase/artifacts/", { cwd: baseDir });

      const commitMessage = `Add artifacts: ${batchContext.createdArtifacts.join(", ")}\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude <noreply@anthropic.com>`;

      execSync(`git commit -m "${commitMessage}"`, { cwd: baseDir });

      // Push to remote
      execSync(`git push -u origin ${currentBranch}`, { cwd: baseDir });

      // Create PR using gh CLI
      const prTitle = `Add artifacts: ${batchContext.createdArtifacts.join(", ")}`;
      const prBody = `## Summary\n\nCreated the following artifacts:\n${batchContext.createdArtifacts.map((id) => `- ${id}`).join("\n")}\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)`;

      const prUrl = execSync(
        `gh pr create --title "${prTitle}" --body "${prBody}"`,
        { cwd: baseDir, encoding: "utf8" },
      ).trim();

      setResult({
        success: true,
        message: `Successfully created PR for ${batchContext.createdArtifacts.length} artifact(s)`,
        prUrl,
      });
    } catch (error) {
      setResult({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to submit artifacts",
        error: error instanceof Error ? error : new Error(String(error)),
      });
    } finally {
      setIsLoading(false);
      setHierarchyValidation(null);
    }
  }, [batchContext]);

  // Handle hierarchy validation action selection
  const handleHierarchyAction = useCallback(
    (action: NextStepAction) => {
      if (action.type === "finish") {
        // User chose to finish
        setHierarchyValidation(null);

        // If --submit flag is set, automatically submit
        if (submit) {
          handleSubmit();
        }
        return;
      }

      // User wants to add more artifacts
      // Reset state and launch wizard with the target parent
      console.log("[DEBUG Add] Setting wizard props:", {
        parentId: action.targetParent,
        artifactType: action.targetType,
        actionLabel: action.label,
      });
      setResult(null);
      setHierarchyValidation(null);
      setWizardProps({
        parentId: action.targetParent,
        artifactType: action.targetType,
      });
      setShowWizard(true);
    },
    [submit, handleSubmit],
  );

  // Handle abort (rollback all created artifacts)
  const handleAbort = useCallback(async () => {
    setIsLoading(true);
    setProgressMessage("Rolling back created artifacts...");
    setHierarchyValidation(null);

    try {
      const fs = await import("node:fs/promises");

      // Delete all created artifact files
      let deletedCount = 0;
      for (const filePath of createdFilePaths) {
        try {
          await fs.unlink(filePath);
          deletedCount++;
          if (verbose) {
            setProgressMessage(
              `Deleted: ${filePath} (${deletedCount}/${createdFilePaths.length})`,
            );
          }
        } catch (error) {
          // If file doesn't exist or can't be deleted, log but continue
          if (verbose) {
            console.error(`Failed to delete ${filePath}:`, error);
          }
        }
      }

      setResult({
        success: false,
        message: `Batch creation aborted. Rolled back ${deletedCount} artifact(s).`,
        error: new Error("User aborted batch creation"),
      });

      // Reset batch state
      setBatchContext(null);
      setCreatedFilePaths([]);
    } catch (error) {
      setResult({
        success: false,
        message: "Failed to rollback artifacts",
        error: error instanceof Error ? error : new Error(String(error)),
      });
    } finally {
      setIsLoading(false);
    }
  }, [createdFilePaths, verbose]);

  // Handle wizard completion
  const handleWizardComplete = useCallback(
    async (wizardResult: WizardCompletionResult) => {
      setShowWizard(false);
      setIsLoading(true);

      try {
        const { artifact, artifactType, id, filePath } = wizardResult;

        // If wizard already created the file (new flow with Step 3 scaffold creation),
        // skip file creation and just do hierarchy validation
        if (id && filePath) {
          setProgressMessage("Artifact file already created by wizard");

          // Track created file for potential rollback
          setCreatedFilePaths((prev) => [...prev, filePath]);

          // Perform hierarchy validation
          setProgressMessage("Validating hierarchy...");
          const baseDir = process.cwd();
          const hierarchyService = new HierarchyValidationService(baseDir);
          const validation = await hierarchyService.validateHierarchyBatch(
            id,
            artifactType,
            batchContext || undefined,
          );

          // Update batch context
          setBatchContext(validation.context);
          setHierarchyValidation(validation);

          setResult({
            success: true,
            message: `Created ${artifactType} ${id}: ${artifact.metadata.title}`,
            artifactId: id,
            filePath,
          });
        } else {
          // Legacy path: wizard didn't create file, so we need to do it here
          // This is for backward compatibility
          setProgressMessage("Creating artifact file...");

          const { parentId } = wizardResult;

          // Initialize services
          const baseDir = process.cwd();
          const artifactsRoot = path.join(baseDir, ".kodebase", "artifacts");
          const idAllocationService = new IdAllocationService(artifactsRoot);
          const artifactService = new ArtifactService();

          // Allocate ID
          let allocatedId: string;
          if (artifactType === CArtifact.INITIATIVE) {
            allocatedId = await idAllocationService.allocateNextInitiativeId();
          } else if (artifactType === CArtifact.MILESTONE) {
            if (!parentId) {
              throw new Error("Parent ID is required for milestones");
            }
            allocatedId =
              await idAllocationService.allocateNextMilestoneId(parentId);
          } else {
            if (!parentId) {
              throw new Error("Parent ID is required for issues");
            }
            allocatedId =
              await idAllocationService.allocateNextIssueId(parentId);
          }

          // Generate slug from title
          const slug =
            artifact.metadata.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "") || allocatedId.toLowerCase();

          // Create artifact file
          const createdFilePath = await artifactService.createArtifact({
            id: allocatedId,
            artifact,
            slug,
            baseDir,
          });

          // Track created file for potential rollback
          setCreatedFilePaths((prev) => [...prev, createdFilePath]);

          // Perform hierarchy validation
          setProgressMessage("Validating hierarchy...");
          const hierarchyService = new HierarchyValidationService(baseDir);
          const validation = await hierarchyService.validateHierarchyBatch(
            allocatedId,
            artifactType,
            batchContext || undefined,
          );

          // Update batch context
          setBatchContext(validation.context);
          setHierarchyValidation(validation);

          setResult({
            success: true,
            message: `Created ${artifactType} ${allocatedId}: ${artifact.metadata.title}`,
            artifactId: allocatedId,
            filePath: createdFilePath,
          });
        }
      } catch (error) {
        setResult({
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to create artifact",
          error: error instanceof Error ? error : new Error(String(error)),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [batchContext],
  );

  useEffect(() => {
    const handleAddCommand = async () => {
      try {
        // Detect operation mode
        const { mode, parentId, title } = detectMode(args);

        if (mode === "wizard") {
          // Launch wizard mode (only if not already launched)
          // This prevents infinite loop when batchContext changes
          // Git validation will happen when creating the artifact in the wizard
          if (!showWizard && !hierarchyValidation) {
            setWizardProps({ parentId });
            setShowWizard(true);
          }
          return;
        }

        // For direct mode, validate git status before artifact creation
        const gitError = await validateGitStatus();
        if (gitError) {
          setResult({
            success: false,
            message: gitError,
            error: new Error(gitError),
          });
          return;
        }

        if (mode === "direct") {
          setIsLoading(true);
          setProgressMessage("Initializing...");
          if (!title) {
            throw new Error("Title is required for direct mode");
          }

          // Infer artifact type from parent ID
          const artifactType = inferArtifactType(parentId);

          setProgressMessage(
            `Creating ${artifactType}${parentId ? ` under ${parentId}` : ""}...`,
          );

          // Validate parent if specified
          if (parentId) {
            const parentValidation = await validateParent(parentId);
            if (!parentValidation.valid) {
              const errorMessage =
                parentValidation.error || "Parent validation failed";
              const suggestion = parentValidation.suggestion
                ? `\n${parentValidation.suggestion}`
                : "";

              // Show blocking reasons if available
              const blockingInfo = parentValidation.blockingReasons?.length
                ? `\n\nBlocking reasons:\n${parentValidation.blockingReasons
                    .map((r) => `  - ${r.message}`)
                    .join("\n")}`
                : "";

              throw new Error(errorMessage + suggestion + blockingInfo);
            }
          }

          // Initialize services
          const baseDir = process.cwd();
          const artifactsRoot = path.join(baseDir, ".kodebase", "artifacts");
          const idAllocationService = new IdAllocationService(artifactsRoot);
          const scaffoldingService = new ScaffoldingService(
            idAllocationService,
          );
          const artifactService = new ArtifactService();

          // Scaffold artifact using appropriate method
          setProgressMessage("Allocating ID and scaffolding artifact...");

          let scaffoldResult: {
            id: string;
            artifact: TAnyArtifact;
            slug: string;
          };
          if (artifactType === CArtifact.INITIATIVE) {
            scaffoldResult = await scaffoldingService.scaffoldInitiative(
              title,
              {
                priority: CPriority.MEDIUM,
              },
            );
          } else if (artifactType === CArtifact.MILESTONE) {
            if (!parentId) {
              throw new Error("Parent ID is required for milestones");
            }
            scaffoldResult = await scaffoldingService.scaffoldMilestone(
              parentId,
              title,
              {
                priority: CPriority.MEDIUM,
                estimation: CEstimationSize.M,
                summary: title,
              },
            );
          } else {
            // issue
            if (!parentId) {
              throw new Error("Parent ID is required for issues");
            }
            scaffoldResult = await scaffoldingService.scaffoldIssue(
              parentId,
              title,
              {
                priority: CPriority.MEDIUM,
                estimation: CEstimationSize.M,
                summary: title,
              },
            );
          }

          const { id, artifact, slug } = scaffoldResult;

          // Create artifact file
          setProgressMessage("Creating artifact file...");
          const filePath = await artifactService.createArtifact({
            id,
            artifact,
            slug,
            baseDir,
          });

          // Track created file for potential rollback
          setCreatedFilePaths((prev) => [...prev, filePath]);

          // Perform hierarchy validation
          setProgressMessage("Validating hierarchy...");
          const hierarchyService = new HierarchyValidationService(baseDir);
          const validation = await hierarchyService.validateHierarchyBatch(
            id,
            artifactType,
            batchContext || undefined,
          );

          // Update batch context
          setBatchContext(validation.context);
          setHierarchyValidation(validation);

          // TODO: Generate AI prompt and copy to clipboard (per spec)

          setResult({
            success: true,
            message: `Created ${artifactType} ${id}: ${title}`,
            artifactId: id,
            filePath,
          });
        }
      } catch (error) {
        setResult({
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to create artifact",
          error: error instanceof Error ? error : new Error(String(error)),
        });
      } finally {
        setIsLoading(false);
      }
    };

    handleAddCommand();
  }, [args, batchContext, showWizard, hierarchyValidation]);

  // Show wizard if in wizard mode
  if (showWizard) {
    // Use a key to force remount when wizard props change
    const wizardKey = `${wizardProps.artifactType || "none"}-${wizardProps.parentId || "none"}`;
    return (
      <WizardFlow
        key={wizardKey}
        parentId={wizardProps.parentId}
        artifactType={wizardProps.artifactType}
        onComplete={handleWizardComplete}
        verbose={verbose}
        batchContext={batchContext}
      />
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Box flexDirection="column">
        <Text dimColor>{progressMessage || "Creating artifact..."}</Text>
      </Box>
    );
  }

  // Show hierarchy validation menu if validation is present
  if (hierarchyValidation && result?.success) {
    return (
      <Box flexDirection="column">
        {/* Show success message for just-created artifact */}
        <Box flexDirection="column" marginBottom={1}>
          <Text color="green">✓ {result.message}</Text>
          {result.filePath && <Text dimColor> File: {result.filePath}</Text>}
        </Box>

        {/* Show hierarchy validation menu */}
        <HierarchyValidationMenu
          validationResult={hierarchyValidation}
          onSelectAction={handleHierarchyAction}
          onAbort={handleAbort}
          verbose={verbose}
        />
      </Box>
    );
  }

  // Error state
  if (!result?.success) {
    return (
      <ErrorHandler
        error={
          result?.error || new Error("Unknown error during artifact creation")
        }
        verbose={verbose}
      />
    );
  }

  // Final success state (no more validation needed)
  return (
    <Box flexDirection="column">
      <Text color="green">✓ {result.message}</Text>
      {result.filePath && <Text dimColor> File: {result.filePath}</Text>}
      {result.artifactId && (
        <Text dimColor> Next: kb start {result.artifactId}</Text>
      )}
      {result.prUrl && (
        <Text>
          {"\n"}
          <Text color="blue">Pull Request:</Text> {result.prUrl}
        </Text>
      )}
      {batchContext && (
        <Box marginTop={1} flexDirection="column">
          <Text color="green" bold>
            ✓ Batch creation complete!
          </Text>
          <Text dimColor>
            {" "}
            Created: {batchContext.createdArtifacts.join(", ")}
          </Text>
        </Box>
      )}
    </Box>
  );
};
