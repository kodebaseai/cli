/**
 * Wizard Flow Component
 *
 * Main orchestrator for the AI-assisted artifact creation wizard.
 * Handles navigation, state management, and step rendering.
 *
 * Based on spec: .kodebase/docs/specs/cli/artifact-wizard.md
 */

import type { TArtifactType } from "@kodebase/core";
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
  DEFAULT_WIZARD_STATE,
  STEP_ORDER_IDE,
  STEP_ORDER_WEB,
  type WizardState,
  type WizardStep,
} from "./types.js";

export interface WizardFlowProps {
  verbose?: boolean;
  /** Pre-selected artifact type (for direct mode) */
  artifactType?: string;
  /** Pre-selected parent ID (for direct mode) */
  parentId?: string;
  /** Pre-filled objective (for direct mode) */
  objective?: string;
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
}) => {
  const [wizardState, setWizardState] = useState<WizardState>(() => ({
    ...DEFAULT_WIZARD_STATE,
    // Pre-fill from props if provided (direct mode)
    artifactType: artifactType as TArtifactType,
    parentId,
    objective: objective || "",
  }));
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
      // Wizard complete - proceed to hierarchy validation
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
    if (key.escape) {
      handleCancel();
    } else if (input === "b" || input === "B") {
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

  const getStepName = (step: WizardStep): string => {
    switch (step) {
      case "type-parent-selection":
        return "Type & Parent Selection";
      case "objective-input":
        return "Objective Input";
      case "ai-prompt-generation":
        return "AI Prompt Generation";
      case "ai-completion-wait":
        return "Waiting for AI";
      case "ai-response-input":
        return "AI Response Input";
      case "preview-confirmation":
        return "Preview & Confirmation";
      default:
        return step;
    }
  };

  return (
    <Box flexDirection="column">
      <Newline />
      <Text bold color="cyan">
        🧙 Artifact Creation Wizard
      </Text>

      {/* Progress indicator */}
      <Box>
        <Text color="gray">
          Step {currentStepIndex + 1} of {currentStepOrder.length}:
        </Text>
        <Text color="yellow" bold>
          {" "}
          {getStepName(wizardState.currentStep)}
        </Text>
      </Box>

      {/* Progress bar */}
      <Box>
        <Text color="gray">[</Text>
        {currentStepOrder.map((step, index) => (
          <Text key={step} color={index <= currentStepIndex ? "green" : "gray"}>
            {index <= currentStepIndex ? "●" : "○"}
          </Text>
        ))}
        <Text color="gray">]</Text>
      </Box>

      <Newline />

      {renderCurrentStep()}
    </Box>
  );
};
