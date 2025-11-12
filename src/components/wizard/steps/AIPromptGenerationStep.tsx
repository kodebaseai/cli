/**
 * AI Prompt Generation Step
 *
 * Third step of the AI-assisted wizard. Generates a context-aware prompt
 * and copies it to clipboard for the user to paste into their AI assistant.
 *
 * Based on spec: .kodebase/docs/specs/cli/artifact-wizard.md (lines 585-818)
 */

import clipboard from "clipboardy";
import { Box, Newline, Text } from "ink";
import Spinner from "ink-spinner";
import type { FC } from "react";
import { useEffect, useState } from "react";

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
}) => {
  const [isGenerating, setIsGenerating] = useState(true);
  const [generationError, setGenerationError] = useState<string>("");
  const [clipboardSuccess, setClipboardSuccess] = useState(false);
  const [clipboardFallback, setClipboardFallback] = useState(false);

  useEffect(() => {
    const generatePrompt = async () => {
      if (!state.artifactType) {
        setGenerationError("No artifact type specified");
        setIsGenerating(false);
        return;
      }

      try {
        // Detect AI environment if not already detected
        const aiEnv = await detectAIEnvironment();

        // Generate prompt
        const result = await generateAIPrompt({
          artifactType: state.artifactType,
          parentId: state.parentId,
          objective: state.objective,
          aiEnvironment: aiEnv,
        });

        // Try to copy to clipboard
        try {
          await clipboard.write(result.prompt);
          setClipboardSuccess(true);
        } catch (_clipboardError) {
          // Clipboard not available - show prompt directly
          setClipboardFallback(true);
        }

        // Update state with generated prompt and metadata
        onUpdate({
          aiEnvironment: aiEnv,
          generatedPrompt: result.prompt,
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
  }, [state.artifactType, state.parentId, state.objective, onUpdate]);

  if (isGenerating) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">
          Step 3: AI Prompt Generation
        </Text>
        <Newline />
        <Box>
          <Text color="yellow">
            <Spinner type="dots" />
          </Text>
          <Text> Generating AI prompt...</Text>
        </Box>
        <Newline />
        <Text color="gray">✓ Loading parent context</Text>
        <Text color="gray">✓ Loading artifact schema</Text>
        <Text color="gray">✓ Preparing prompt template</Text>
      </Box>
    );
  }

  if (generationError) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">
          Step 3: AI Prompt Generation
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
        Step 3: AI Prompt Generation
      </Text>
      <Text color="gray">
        Creating: {artifactTypeLabel}
        {state.parentId && ` under ${state.parentId}`}
      </Text>
      <Newline />

      {clipboardSuccess && (
        <>
          <Box flexDirection="column">
            <Text color="green">✓ Loaded parent context</Text>
            <Text color="green">✓ Loaded artifact schema</Text>
            <Text color="green">✓ Generated prompt template</Text>
            <Text color="green" bold>
              ✓ Copied to clipboard!
            </Text>
          </Box>
          <Newline />
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
              <Text>3. The AI will create the artifact file directly</Text>
              <Text>4. Press Enter here to continue once the AI confirms</Text>
            </>
          ) : (
            <>
              <Text>1. Open your AI assistant ({envName})</Text>
              <Text>2. Paste the prompt (Cmd+V / Ctrl+V)</Text>
              <Text>3. Copy the AI's YAML response</Text>
              <Text>4. Create the artifact file at the specified path</Text>
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
