/**
 * Wizard Types and Interfaces
 *
 * Defines the type system for the AI-assisted artifact creation wizard.
 * Based on spec: .kodebase/docs/specs/cli/artifact-wizard.md
 */

import type {
  TAnyArtifact,
  TArtifactType,
  TEstimationSize,
  TPriority,
} from "@kodebase/core";

/**
 * Wizard steps for AI-assisted flow (IDE environment)
 */
export type WizardStepIDE =
  | "type-parent-selection"
  | "objective-input"
  | "ai-prompt-generation"
  | "ai-completion-wait"
  | "preview-confirmation";

/**
 * Wizard steps for AI-assisted flow (Web environment)
 */
export type WizardStepWeb =
  | "type-parent-selection"
  | "objective-input"
  | "ai-prompt-generation"
  | "ai-response-input"
  | "preview-confirmation";

/**
 * All possible wizard steps
 */
export type WizardStep = WizardStepIDE | WizardStepWeb;

/**
 * Priority levels for artifacts
 */
export type Priority = TPriority;

/**
 * Estimation sizes for artifacts
 */
export type Estimation = TEstimationSize;

/**
 * AI environment detection result
 */
export type AIEnvironment = "ide" | "web";

/**
 * Parent artifact option for selection list
 */
export interface ParentOption {
  /** Artifact ID (e.g., "A", "A.1") */
  id: string;
  /** Display label (e.g., "A - The MVP") */
  label: string;
  /** Artifact title */
  title: string;
  /** Artifact type */
  type: TArtifactType;
}

/**
 * Batch creation context for tracking artifacts created in a single session
 */
export interface BatchCreationContext {
  /** The root artifact ID being created (initiative or milestone) */
  rootArtifactId: string;
  /** The root artifact type */
  rootArtifactType: "initiative" | "milestone";
  /** All artifacts created in this batch (for rollback) */
  createdArtifacts: string[];
  /** Milestones that still need issues */
  incompleteMilestones: string[];
}

/**
 * Wizard state for AI-assisted artifact creation
 */
export interface WizardState {
  /** Current step in the wizard */
  currentStep: WizardStep;

  /** AI environment (IDE or web) */
  aiEnvironment: AIEnvironment;

  /** Selected artifact type */
  artifactType?: TArtifactType;

  /** Parent artifact ID (required for milestone/issue) */
  parentId?: string;

  /** User's objective/idea in natural language */
  objective: string;

  /** Generated AI prompt (stored for reference) */
  generatedPrompt?: string;

  /** AI-generated or created artifact */
  artifact?: TAnyArtifact;

  /** File path where artifact will be/was created */
  filePath?: string;

  /** Batch creation context (if creating initiative/milestone) */
  batchContext?: BatchCreationContext;

  /** Wizard completion status */
  isComplete: boolean;

  /** Validation errors by field */
  errors: Record<string, string>;
}

/**
 * Props for wizard step components
 */
export interface StepComponentProps {
  /** Current wizard state */
  state: WizardState;
  /** Update wizard state */
  onUpdate: (updates: Partial<WizardState>) => void;
  /** Proceed to next step */
  onNext: () => void;
  /** Go back to previous step */
  onBack: () => void;
  /** Cancel wizard */
  onCancel: () => void;
  /** Verbose mode flag */
  verbose?: boolean;
}

/**
 * Next step action for hierarchy validation menu
 */
export interface NextStepAction {
  /** Display label */
  label: string;
  /** Action type */
  type: "add_issue" | "add_milestone" | "finish";
  /** Target parent ID (for add actions) */
  targetParent?: string;
  /** Target artifact type (for add actions) */
  targetType?: TArtifactType;
  /** Whether this action is required (shows "FIRST" label) */
  isRequired?: boolean;
}

/**
 * Hierarchy validation result
 */
export interface HierarchyValidationResult {
  /** Whether the hierarchy is valid */
  valid: boolean;
  /** Message to display */
  message: string;
  /** Available next step actions */
  actions: NextStepAction[];
  /** Updated batch context */
  context: BatchCreationContext;
}

/**
 * Default wizard state
 */
export const DEFAULT_WIZARD_STATE: WizardState = {
  currentStep: "type-parent-selection",
  aiEnvironment: "web", // Will be detected on init
  objective: "",
  isComplete: false,
  errors: {},
};

/**
 * Step order for IDE flow
 */
export const STEP_ORDER_IDE: WizardStepIDE[] = [
  "type-parent-selection",
  "objective-input",
  "ai-prompt-generation",
  "ai-completion-wait",
  "preview-confirmation",
];

/**
 * Step order for Web flow
 */
export const STEP_ORDER_WEB: WizardStepWeb[] = [
  "type-parent-selection",
  "objective-input",
  "ai-prompt-generation",
  "ai-response-input",
  "preview-confirmation",
];

/**
 * Priority options with descriptions
 */
export const PRIORITY_OPTIONS: Array<{
  value: Priority;
  label: string;
  description: string;
}> = [
  {
    value: "critical",
    label: "Critical",
    description: "Urgent, blocks other work",
  },
  {
    value: "high",
    label: "High",
    description: "Important, should be done soon",
  },
  { value: "medium", label: "Medium", description: "Normal priority" },
  { value: "low", label: "Low", description: "Nice to have, can wait" },
];

/**
 * Estimation options with descriptions
 */
export const ESTIMATION_OPTIONS: Array<{
  value: Estimation;
  label: string;
  description: string;
}> = [
  { value: "XS", label: "XS", description: "< 1 day" },
  { value: "S", label: "S", description: "1-3 days" },
  { value: "M", label: "M", description: "3-7 days" },
  { value: "L", label: "L", description: "1-2 weeks" },
  { value: "XL", label: "XL", description: "2+ weeks" },
];
