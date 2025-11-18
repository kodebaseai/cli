/**
 * AI Prompt Generation Step
 *
 * Third step of the AI-assisted wizard. Generates a context-aware prompt
 * and copies it to clipboard for the user to paste into their AI assistant.
 *
 * Based on spec: .kodebase/docs/reference/specs/cli/artifact-wizard.md (lines 585-818)
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
import clipboard from "clipboardy";
import { Box, Newline, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import type { FC } from "react";
import { useEffect, useState } from "react";
import {
  checkGHCLI,
  createArtifactBranch,
  createDraftPR,
} from "../../../utils/git-branch.js";
import type { StepComponentProps } from "../types.js";
import {
  detectAIEnvironment,
  getAIEnvironmentName,
} from "../utils/ai-environment.js";
import { generateAIPrompt } from "../utils/prompt-generator.js";

/**
 * AI Prompt Generation Step Component
 *
 * Generates AI prompt, copies to clipboard, and shows next steps
 */
export const AIPromptGenerationStep: FC<StepComponentProps> = ({
  state,
  onUpdate,
  onNext,
}) => {
  const [isGenerating, setIsGenerating] = useState(true);
  const [generationError, setGenerationError] = useState<string>("");
  const [clipboardSuccess, setClipboardSuccess] = useState(false);
  const [clipboardFallback, setClipboardFallback] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Handle keyboard input to proceed to next step
  useInput(
    (_input, key) => {
      if (!isGenerating && !generationError) {
        if (key.return) {
          onNext();
        }
      }
    },
    { isActive: !isGenerating && !generationError },
  );

  useEffect(() => {
    // Prevent multiple executions
    if (hasGenerated) {
      return;
    }

    const generatePrompt = async () => {
      if (!state.artifactType) {
        setGenerationError("No artifact type specified");
        setIsGenerating(false);
        return;
      }

      setHasGenerated(true); // Mark as generated immediately to prevent re-runs

      try {
        // Detect AI environment if not already detected
        const aiEnv = await detectAIEnvironment();

        const baseDir = process.cwd();
        const artifactsRoot = path.join(baseDir, ".kodebase", "artifacts");

        let scaffoldResult: {
          id: string;
          artifact: TAnyArtifact;
          slug: string;
        };
        let filePath: string;

        // Check if we already have an allocated ID and file path
        if (state.allocatedId && state.filePath) {
          // Reuse existing allocation
          const artifactService = new ArtifactService();
          const artifact = await artifactService.getArtifact({
            id: state.allocatedId,
            baseDir,
          });

          // Extract slug from file path (format: artifacts/ID.slug/ID.yml)
          const pathParts = state.filePath.split(path.sep);
          const folderName = pathParts[pathParts.length - 2]; // Get folder name
          if (!folderName) {
            throw new Error("Invalid file path structure");
          }
          const slug = folderName.substring(state.allocatedId.length + 1); // Remove "ID." prefix

          scaffoldResult = {
            id: state.allocatedId,
            artifact,
            slug,
          };
          filePath = state.filePath;
        } else {
          // Allocate new ID first (without creating files yet)
          const idAllocationService = new IdAllocationService(artifactsRoot);
          const scaffoldingService = new ScaffoldingService(
            idAllocationService,
          );

          if (state.artifactType === CArtifact.INITIATIVE) {
            scaffoldResult = await scaffoldingService.scaffoldInitiative(
              state.objective,
              { priority: CPriority.MEDIUM },
            );
          } else if (state.artifactType === CArtifact.MILESTONE) {
            if (!state.parentId) {
              throw new Error("Parent ID required for milestone");
            }
            scaffoldResult = await scaffoldingService.scaffoldMilestone(
              state.parentId,
              state.objective,
              {
                priority: CPriority.MEDIUM,
                estimation: CEstimationSize.M,
                summary: state.objective,
              },
            );
          } else {
            // issue
            if (!state.parentId) {
              throw new Error("Parent ID required for issue");
            }
            scaffoldResult = await scaffoldingService.scaffoldIssue(
              state.parentId,
              state.objective,
              {
                priority: CPriority.MEDIUM,
                estimation: CEstimationSize.M,
                summary: state.objective,
              },
            );
          }

          // Create branch BEFORE creating scaffold file (to keep working dir clean)
          // Branch should be created for the ROOT artifact only
          const isRootArtifact =
            !state.batchContext ||
            state.batchContext.createdArtifacts.length === 0;

          // Determine which artifact ID to use for the branch
          // Branch is always based on the root artifact (e.g., "add/f", not "add/f.1")
          const branchArtifactId = state.batchContext
            ? state.batchContext.rootArtifactId
            : scaffoldResult.id;

          console.log("[DEBUG] Branch creation check:", {
            isRootArtifact,
            hasBatchContext: !!state.batchContext,
            createdCount: state.batchContext?.createdArtifacts.length,
            createdBranch: state.createdBranch,
            currentArtifactId: scaffoldResult.id,
            branchArtifactId,
          });

          if (isRootArtifact && !state.createdBranch) {
            console.log("[DEBUG] Creating branch for:", branchArtifactId);
            const branchResult = await createArtifactBranch(branchArtifactId);
            console.log("[DEBUG] Branch result:", branchResult);

            if (branchResult.success && branchResult.branchName) {
              // Store branch name in state
              onUpdate({ createdBranch: branchResult.branchName });

              // Check if gh CLI is available for PR creation
              const hasGH = await checkGHCLI();
              if (hasGH) {
                const { prUrl } = await createDraftPR(
                  branchArtifactId, // Use root artifact ID for PR
                  scaffoldResult.artifact.metadata.title,
                  branchResult.branchName,
                );
                if (prUrl) {
                  // Store PR URL in state
                  onUpdate({ draftPrUrl: prUrl });
                }
              }
            } else {
              console.error(
                "[DEBUG] Branch creation failed:",
                branchResult.error,
              );
              // Don't throw - continue with scaffold creation even if branch fails
            }
          } else {
            console.log(
              "[DEBUG] Skipping branch creation - already exists or not root",
            );
          }

          // Now create the scaffold file
          const artifactService = new ArtifactService();
          filePath = await artifactService.createArtifact({
            id: scaffoldResult.id,
            artifact: scaffoldResult.artifact,
            slug: scaffoldResult.slug,
            baseDir,
          });
        }

        // Generate prompt with the allocated ID and file path
        const result = await generateAIPrompt({
          artifactType: state.artifactType,
          parentId: state.parentId,
          objective: state.objective,
          aiEnvironment: aiEnv,
          allocatedId: scaffoldResult.id,
          filePath,
        });

        // Try to copy to clipboard
        try {
          await clipboard.write(result.prompt);
          setClipboardSuccess(true);
        } catch (_clipboardError) {
          // Clipboard not available - show prompt directly
          setClipboardFallback(true);
        }

        // Update state with generated prompt, allocated ID, and file path
        onUpdate({
          aiEnvironment: aiEnv,
          generatedPrompt: result.prompt,
          artifact: scaffoldResult.artifact,
          allocatedId: scaffoldResult.id, // Store the allocated ID
          filePath,
          errors: {},
        });

        setIsGenerating(false);
      } catch (error) {
        setGenerationError(
          error instanceof Error ? error.message : "Failed to generate prompt",
        );
        setIsGenerating(false);
      }
    };

    generatePrompt();
  }, [
    state.artifactType,
    state.parentId,
    state.objective,
    state.allocatedId,
    state.filePath,
    state.batchContext,
    state.createdBranch,
    onUpdate,
    hasGenerated,
  ]);

  if (isGenerating) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">
          Generating AI Prompt
        </Text>
        <Newline />
        <Box>
          <Text color="yellow">
            <Spinner type="dots" />
          </Text>
          <Text> Generating AI prompt...</Text>
        </Box>
        <Newline />
        <Text color="gray">✓ Allocating artifact ID</Text>
        <Text color="gray">✓ Creating scaffold file</Text>
        <Text color="gray">✓ Loading parent context</Text>
        <Text color="gray">✓ Preparing prompt template</Text>
      </Box>
    );
  }

  if (generationError) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">
          Generating AI Prompt
        </Text>
        <Newline />
        <Text color="red">✗ {generationError}</Text>
        <Newline />
        <Box>
          <Text color="yellow">Press B to go back </Text>
          <Text color="gray">| </Text>
          <Text color="red">ESC to cancel</Text>
        </Box>
      </Box>
    );
  }

  const artifactTypeLabel = state.artifactType
    ? state.artifactType.charAt(0).toUpperCase() + state.artifactType.slice(1)
    : "";
  const envName = getAIEnvironmentName(state.aiEnvironment);

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        AI Prompt Ready
      </Text>
      <Text color="gray">
        Creating: {artifactTypeLabel}
        {state.parentId && ` under ${state.parentId}`}
      </Text>
      <Newline />

      {clipboardSuccess && (
        <>
          <Box flexDirection="column">
            <Text color="green">✓ Allocated artifact ID</Text>
            <Text color="green">✓ Created scaffold file</Text>
            {state.createdBranch && (
              <Text color="green">✓ Created branch: {state.createdBranch}</Text>
            )}
            {state.draftPrUrl && <Text color="green">✓ Created draft PR</Text>}
            <Text color="green">✓ Loaded parent context</Text>
            <Text color="green">✓ Generated prompt template</Text>
            <Text color="green" bold>
              ✓ Copied to clipboard!
            </Text>
          </Box>
          <Newline />
          {state.filePath && (
            <>
              <Box
                flexDirection="column"
                borderStyle="round"
                borderColor="green"
                paddingX={1}
              >
                <Text color="green" bold>
                  📄 Scaffold file created:
                </Text>
                <Text color="yellow">{state.filePath}</Text>
                {state.draftPrUrl && (
                  <>
                    <Newline />
                    <Text color="green" bold>
                      📝 Draft PR:
                    </Text>
                    <Text color="cyan">{state.draftPrUrl}</Text>
                  </>
                )}
              </Box>
              <Newline />
            </>
          )}
        </>
      )}

      {clipboardFallback && (
        <>
          <Text color="yellow">⚠ Clipboard not available</Text>
          <Text color="gray">Prompt will be shown below for manual copy</Text>
          <Newline />
        </>
      )}

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="cyan"
        paddingX={1}
        paddingY={1}
      >
        <Text bold color="cyan">
          📋 Prompt {clipboardSuccess ? "copied to clipboard!" : "generated"}
        </Text>
        <Newline />
        <Text bold>Next steps:</Text>
        <Box flexDirection="column" marginLeft={2}>
          {state.aiEnvironment === "ide" ? (
            <>
              <Text>
                1. Open your AI assistant (Cursor Composer, Claude in VSCode,
                etc.)
              </Text>
              <Text>2. Paste the prompt (Cmd+V / Ctrl+V)</Text>
              <Text>
                3. The AI will fill in the scaffold file at the path shown above
              </Text>
              <Text>4. Press Enter here once done</Text>
            </>
          ) : (
            <>
              <Text>1. Open your AI assistant ({envName})</Text>
              <Text>2. Paste the prompt (Cmd+V / Ctrl+V)</Text>
              <Text>3. Copy the AI's YAML response</Text>
              <Text>
                4. Paste it into the scaffold file at the path shown above
              </Text>
              <Text>5. Return here and press Enter to continue</Text>
            </>
          )}
        </Box>
      </Box>

      <Newline />

      {clipboardFallback && (
        <>
          <Box
            flexDirection="column"
            borderStyle="single"
            borderColor="gray"
            paddingX={1}
            paddingY={1}
          >
            <Text color="gray">Prompt:</Text>
            <Text>{state.generatedPrompt}</Text>
          </Box>
          <Newline />
        </>
      )}

      <Box>
        <Text color="green" bold>
          Press Enter when ready to continue
        </Text>
        <Text color="gray"> | </Text>
        <Text color="yellow">B to go back</Text>
        <Text color="gray"> | </Text>
        <Text color="red">ESC to cancel</Text>
      </Box>
    </Box>
  );
};
