/**
 * Setup Wizard Component
 *
 * Orchestrates the 6-step setup flow for Kodebase CLI initial configuration.
 *
 * Steps:
 * 1. Environment Detection - Check git repo, Node.js, GitHub
 * 2. GitHub Authentication - Verify gh CLI authentication
 * 3. Preset Selection - Team size → preset mapping
 * 4. Configuration - Generate and save KodebaseConfig
 * 5. Hook Installation - Install git hooks
 * 6. Completion - Success message and next steps
 */

import type { ConfigPreset } from "@kodebase/config";
import { Box, Text } from "ink";
import type { FC } from "react";
import { useState } from "react";
import { CompletionStep } from "./steps/CompletionStep.js";
import { ConfigurationStep } from "./steps/ConfigurationStep.js";
import { EnvironmentDetectionStep } from "./steps/EnvironmentDetectionStep.js";
import { GitHubAuthStep } from "./steps/GitHubAuthStep.js";
import { HookInstallationStep } from "./steps/HookInstallationStep.js";
import { PresetSelectionStep } from "./steps/PresetSelectionStep.js";

export type SetupStep =
  | "environment"
  | "github-auth"
  | "preset-selection"
  | "configuration"
  | "hook-installation"
  | "completion";

export interface SetupWizardProps {
  onComplete: () => void;
  onError: (error: Error) => void;
  preset?: "solo" | "small_team" | "enterprise";
  skipAuth?: boolean;
  skipHooks?: boolean;
  force?: boolean;
  verbose?: boolean;
}

interface WizardState {
  environmentValid: boolean;
  githubAuthenticated: boolean;
  selectedPreset?: ConfigPreset;
  presetName?: "solo" | "small_team" | "enterprise";
  configSaved: boolean;
  hooksInstalled: boolean;
}

/**
 * Setup wizard for Kodebase CLI
 *
 * Guides users through initial configuration with environment validation,
 * GitHub authentication, preset selection, config generation, and hook installation.
 */
export const SetupWizard: FC<SetupWizardProps> = ({
  onComplete,
  onError,
  preset,
  skipAuth,
  skipHooks,
  force,
  verbose,
}) => {
  const [currentStep, setCurrentStep] = useState<SetupStep>(() => {
    // If preset provided, skip to configuration
    if (preset) {
      return "configuration";
    }
    return "environment";
  });

  const [state, setState] = useState<WizardState>({
    environmentValid: false,
    githubAuthenticated: false,
    configSaved: false,
    hooksInstalled: false,
  });

  // Progress through steps
  const nextStep = () => {
    switch (currentStep) {
      case "environment":
        setCurrentStep(skipAuth ? "preset-selection" : "github-auth");
        break;
      case "github-auth":
        setCurrentStep("preset-selection");
        break;
      case "preset-selection":
        setCurrentStep("configuration");
        break;
      case "configuration":
        setCurrentStep(skipHooks ? "completion" : "hook-installation");
        break;
      case "hook-installation":
        setCurrentStep("completion");
        break;
      case "completion":
        onComplete();
        break;
    }
  };

  // Update wizard state and advance
  const updateStateAndAdvance = (updates: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...updates }));
    nextStep();
  };

  // Step-specific handlers
  const handleEnvironmentValid = () => {
    updateStateAndAdvance({ environmentValid: true });
  };

  const handleGitHubAuth = (authenticated: boolean) => {
    updateStateAndAdvance({ githubAuthenticated: authenticated });
  };

  const handlePresetSelected = (
    presetConfig: ConfigPreset,
    presetName: "solo" | "small_team" | "enterprise",
  ) => {
    updateStateAndAdvance({
      selectedPreset: presetConfig,
      presetName,
    });
  };

  const handleConfigSaved = () => {
    updateStateAndAdvance({ configSaved: true });
  };

  const handleHooksInstalled = () => {
    updateStateAndAdvance({ hooksInstalled: true });
  };

  // Progress indicator
  const steps: SetupStep[] = [
    "environment",
    ...(skipAuth ? [] : (["github-auth"] as const)),
    "preset-selection",
    "configuration",
    ...(skipHooks ? [] : (["hook-installation"] as const)),
    "completion",
  ];
  const currentIndex = steps.indexOf(currentStep);
  const progress = `${currentIndex + 1}/${steps.length}`;

  return (
    <Box flexDirection="column">
      {/* Progress indicator */}
      {currentStep !== "completion" && (
        <Box marginBottom={1}>
          <Text dimColor>Step {progress}</Text>
        </Box>
      )}

      {/* Render current step */}
      {currentStep === "environment" && (
        <EnvironmentDetectionStep
          onComplete={handleEnvironmentValid}
          onError={onError}
          verbose={verbose}
        />
      )}

      {currentStep === "github-auth" && (
        <GitHubAuthStep
          onComplete={handleGitHubAuth}
          onError={onError}
          skipAuth={skipAuth}
          verbose={verbose}
        />
      )}

      {currentStep === "preset-selection" && (
        <PresetSelectionStep
          onComplete={handlePresetSelected}
          onError={onError}
          preselectedPreset={preset}
          verbose={verbose}
        />
      )}

      {currentStep === "configuration" && (
        <ConfigurationStep
          onComplete={handleConfigSaved}
          onError={onError}
          preset={state.selectedPreset}
          presetName={state.presetName || preset}
          force={force}
          verbose={verbose}
        />
      )}

      {currentStep === "hook-installation" && (
        <HookInstallationStep
          onComplete={handleHooksInstalled}
          onError={onError}
          force={force}
          verbose={verbose}
        />
      )}

      {currentStep === "completion" && (
        <CompletionStep
          presetName={state.presetName || preset || "solo"}
          onComplete={onComplete}
        />
      )}
    </Box>
  );
};
