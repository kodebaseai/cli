/**
 * Wizard Flow Component
 *
 * Main orchestrator for the AI-assisted artifact creation wizard.
 * Handles navigation, state management, and step rendering.
 *
 * Based on spec: .kodebase/docs/reference/specs/cli/artifact-wizard.md
 */

import type { TAnyArtifact, TArtifactType } from "@kodebase/core";
import { Box, Newline, Text, useInput } from "ink";
import type { FC } from "react";
import { useState } from "react";
import { AICompletionWaitStep } from "./steps/AICompletionWaitStep.js";
import { AIPromptGenerationStep } from "./steps/AIPromptGenerationStep.js";
import { AIResponseInputStep } from "./steps/AIResponseInputStep.js";
import { ObjectiveInputStep } from "./steps/ObjectiveInputStep.js";
import { PreviewConfirmationStep } from "./steps/PreviewConfirmationStep.js";
import { TypeParentSelectionStep } from "./steps/TypeParentSelectionStep.js";
import {
  type BatchCreationContext,
  DEFAULT_WIZARD_STATE,
  STEP_ORDER_IDE,
  STEP_ORDER_WEB,
  type WizardState,
  type WizardStep,
} from "./types.js";

export interface WizardCompletionResult {
  /** The generated artifact */
  artifact: TAnyArtifact;
  /** Artifact type */
  artifactType: TArtifactType;
  /** Parent ID (if applicable) */
  parentId?: string;
  /** AI-generated slug */
  slug?: string;
  /** Allocated artifact ID (already created in Step 3) */
  id?: string;
  /** File path where artifact was created (already created in Step 3) */
  filePath?: string;
}

export interface WizardFlowProps {
  verbose?: boolean;
  /** Pre-selected artifact type (for direct mode) */
  artifactType?: string;
  /** Pre-selected parent ID (for direct mode) */
  parentId?: string;
  /** Pre-filled objective (for direct mode) */
  objective?: string;
  /** Callback when wizard completes successfully */
  onComplete?: (result: WizardCompletionResult) => void;
  /** Callback when branch is created */
  onBranchCreated?: (branchName: string, prUrl?: string) => void;
  /** Created artifacts in current session for tree view */
  createdArtifacts?: string[];
  /** Batch creation context (for tracking branch creation) */
  batchContext?: BatchCreationContext | null;
}

/**
 * Wizard Flow Component
 *
 * AI-assisted interactive wizard for artifact creation.
 * Supports both IDE and web-based AI workflows.
 */
export const WizardFlow: FC<WizardFlowProps> = ({
  verbose,
  artifactType,
  parentId,
  objective,
  onComplete,
  batchContext,
}) => {
  const [wizardState, setWizardState] = useState<WizardState>(() => {
    console.log("[DEBUG WizardFlow] Initializing with props:", {
      artifactType,
      parentId,
      objective,
      hasBatchContext: !!batchContext,
    });

    // Determine starting step based on what's pre-filled
    let startStep: WizardStep = "type-parent-selection";

    // If artifactType is provided, skip type selection
    if (artifactType) {
      console.log(
        "[DEBUG WizardFlow] artifactType provided, skipping to objective-input",
      );
      startStep = "objective-input";
    }

    return {
      ...DEFAULT_WIZARD_STATE,
      currentStep: startStep,
      // Pre-fill from props if provided (direct mode / batch creation)
      artifactType: artifactType as TArtifactType,
      parentId,
      objective: objective || "",
      batchContext: batchContext || undefined,
    };
  });
  const [isExiting, setIsExiting] = useState(false);

  // Determine step order based on AI environment
  const getStepOrder = (): WizardStep[] => {
    return wizardState.aiEnvironment === "ide"
      ? STEP_ORDER_IDE
      : STEP_ORDER_WEB;
  };

  const currentStepOrder = getStepOrder();
  const currentStepIndex = currentStepOrder.indexOf(wizardState.currentStep);

  const handleStateUpdate = (updates: Partial<WizardState>) => {
    setWizardState((prev) => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < currentStepOrder.length) {
      const nextStep = currentStepOrder[nextIndex];
      if (nextStep) {
        setWizardState((prev) => ({
          ...prev,
          currentStep: nextStep,
        }));
      }
    } else {
      // Wizard complete - call onComplete callback if provided
      if (onComplete && wizardState.artifact && wizardState.artifactType) {
        // Extract ID from filePath (e.g., ".kodebase/artifacts/F.ide-extension/F.yml" → "F")
        const id = wizardState.filePath
          ? wizardState.filePath.split("/").pop()?.replace(".yml", "")
          : undefined;

        // Extract slug from filePath (e.g., ".kodebase/artifacts/F.ide-extension/F.yml" → "ide-extension")
        const slug = wizardState.filePath
          ? wizardState.filePath
              .split("/")
              .slice(-2, -1)[0]
              ?.split(".")
              .slice(1)
              .join(".")
          : undefined;

        onComplete({
          artifact: wizardState.artifact,
          artifactType: wizardState.artifactType,
          parentId: wizardState.parentId,
          slug,
          id,
          filePath: wizardState.filePath,
        });
      }

      // Mark wizard as complete
      setWizardState((prev) => ({
        ...prev,
        isComplete: true,
      }));
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      const prevStep = currentStepOrder[prevIndex];
      if (prevStep) {
        setWizardState((prev) => ({
          ...prev,
          currentStep: prevStep,
        }));
      }
    }
  };

  const handleCancel = () => {
    setIsExiting(true);
    process.exit(0);
  };

  // Global keyboard handler for navigation
  useInput((input, key) => {
    // Disable keyboard shortcuts during steps with active text input
    // to prevent conflicts (e.g., typing 'b' in objective field)
    const isTextInputStep = wizardState.currentStep === "objective-input";

    if (key.escape) {
      handleCancel();
    } else if (!isTextInputStep && (input === "b" || input === "B")) {
      if (currentStepIndex > 0) {
        handleBack();
      }
    } else if (key.return) {
      // Steps handle their own Enter logic
    }
  });

  // Exit early if wizard is cancelled
  if (isExiting) {
    return (
      <Box flexDirection="column">
        <Text color="gray">Wizard cancelled by user</Text>
      </Box>
    );
  }

  // Show completion message when wizard is done
  if (wizardState.isComplete) {
    return (
      <Box flexDirection="column">
        <Text bold color="green">
          ✓ Artifact Created Successfully!
        </Text>
        <Newline />
        <Text color="gray">File: {wizardState.filePath}</Text>
        <Newline />
        <Text color="yellow">Proceeding to hierarchy validation...</Text>
      </Box>
    );
  }

  const renderCurrentStep = () => {
    const stepProps = {
      state: wizardState,
      onUpdate: handleStateUpdate,
      onNext: handleNext,
      onBack: handleBack,
      onCancel: handleCancel,
      verbose,
      batchContext: wizardState.batchContext || null,
    };

    switch (wizardState.currentStep) {
      case "type-parent-selection":
        return <TypeParentSelectionStep {...stepProps} />;
      case "objective-input":
        return <ObjectiveInputStep {...stepProps} />;
      case "ai-prompt-generation":
        return <AIPromptGenerationStep {...stepProps} />;
      case "ai-completion-wait":
        return <AICompletionWaitStep {...stepProps} />;
      case "ai-response-input":
        return <AIResponseInputStep {...stepProps} />;
      case "preview-confirmation":
        return <PreviewConfirmationStep {...stepProps} />;
      default:
        return (
          <Box>
            <Text color="red">Unknown step: {wizardState.currentStep}</Text>
          </Box>
        );
    }
  };

  // Get context-aware title based on artifact type and parent
  const getContextTitle = () => {
    if (!wizardState.artifactType) {
      return "Creating new artifact";
    }

    const typeLabel =
      wizardState.artifactType.charAt(0).toUpperCase() +
      wizardState.artifactType.slice(1);

    if (wizardState.parentId) {
      return `Adding ${typeLabel} to ${wizardState.parentId}`;
    }

    return `Creating ${typeLabel}`;
  };

  return (
    <Box flexDirection="column">
      <Newline />
      <Text bold color="cyan">
        🧙 {getContextTitle()}
      </Text>
      <Newline />

      {renderCurrentStep()}
    </Box>
  );
};
