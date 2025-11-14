/**
 * Hierarchy Validation Service
 *
 * Validates that artifacts satisfy Kodebase hierarchy rules:
 * - Initiative: Must have ≥1 milestone (each with ≥1 issue)
 * - Milestone: Must have ≥1 issue
 * - Issue: Complete (no children required)
 *
 * Used by Add command to enforce batch creation loop until hierarchy is valid.
 */

import { QueryService } from "@kodebase/artifacts";
import type { TArtifactType } from "@kodebase/core";
import type {
  BatchCreationContext,
  HierarchyValidationResult,
  NextStepAction,
} from "../components/wizard/types.js";

export class HierarchyValidationService {
  private queryService: QueryService;
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || process.cwd();
    this.queryService = new QueryService(this.baseDir);
  }

  /**
   * Validate hierarchy for just-created artifact
   *
   * @param artifactId - The just-created artifact ID
   * @param artifactType - The artifact type
   * @param context - Batch creation context (if in batch mode)
   * @returns Validation result with next step actions
   */
  async validateHierarchyBatch(
    artifactId: string,
    artifactType: TArtifactType,
    context?: BatchCreationContext,
  ): Promise<HierarchyValidationResult> {
    // Issue: Always valid (no children required)
    if (artifactType === "issue") {
      return this.handleIssueValidation(artifactId, context);
    }

    // Milestone: Requires ≥1 issue
    if (artifactType === "milestone") {
      return this.handleMilestoneValidation(artifactId, context);
    }

    // Initiative: Requires ≥1 milestone (each with ≥1 issue)
    if (artifactType === "initiative") {
      return this.handleInitiativeValidation(artifactId, context);
    }

    throw new Error(`Unknown artifact type: ${artifactType}`);
  }

  /**
   * Handle issue validation (always valid)
   */
  private async handleIssueValidation(
    artifactId: string,
    context?: BatchCreationContext,
  ): Promise<HierarchyValidationResult> {
    // If we're in batch mode and creating issues for a milestone
    if (context) {
      const parentId = this.getParentId(artifactId);
      const updatedIncompleteMilestones = context.incompleteMilestones.filter(
        (id) => id !== parentId,
      );

      const updatedContext: BatchCreationContext = {
        ...context,
        createdArtifacts: [...context.createdArtifacts, artifactId],
        incompleteMilestones: updatedIncompleteMilestones,
      };

      // Check if there are still incomplete milestones
      if (updatedIncompleteMilestones.length > 0) {
        const actions: NextStepAction[] = [
          {
            label: `Add FIRST issue to ${updatedIncompleteMilestones[0]}`,
            type: "add_issue",
            targetParent: updatedIncompleteMilestones[0],
            targetType: "issue",
            isRequired: true,
          },
          {
            label: `Add another issue to ${parentId}`,
            type: "add_issue",
            targetParent: parentId,
            targetType: "issue",
          },
        ];

        return {
          valid: false,
          message: `Issue ${artifactId} created. Milestone ${parentId} is now valid, but ${updatedIncompleteMilestones.length} milestone(s) still need issues.`,
          actions,
          context: updatedContext,
        };
      }

      // All milestones have issues - hierarchy is complete!
      const actions: NextStepAction[] = [
        {
          label: "Finish (hierarchy is valid)",
          type: "finish",
        },
        {
          label: `Add another issue to ${parentId}`,
          type: "add_issue",
          targetParent: parentId,
          targetType: "issue",
        },
      ];

      return {
        valid: true,
        message: `Issue ${artifactId} created. All milestones have issues - hierarchy is valid!`,
        actions,
        context: updatedContext,
      };
    }

    // Standalone issue (not in batch mode)
    // For standalone issues, we create a context with the parent as root
    const parentId = this.getParentId(artifactId);
    return {
      valid: true,
      message: `Issue ${artifactId} created successfully.`,
      actions: [{ label: "Finish", type: "finish" }],
      context: context || {
        rootArtifactId: parentId,
        rootArtifactType: "milestone",
        createdArtifacts: [artifactId],
        incompleteMilestones: [],
      },
    };
  }

  /**
   * Handle milestone validation (requires ≥1 issue)
   */
  private async handleMilestoneValidation(
    artifactId: string,
    context?: BatchCreationContext,
  ): Promise<HierarchyValidationResult> {
    // Check if milestone has any issues
    const issues = await this.getChildrenIds(artifactId);

    if (issues.length === 0) {
      // Milestone needs at least one issue
      const actions: NextStepAction[] = [
        {
          label: `Add FIRST issue to ${artifactId}`,
          type: "add_issue",
          targetParent: artifactId,
          targetType: "issue",
          isRequired: true,
        },
      ];

      const newContext: BatchCreationContext = context || {
        rootArtifactId: artifactId,
        rootArtifactType: "milestone",
        createdArtifacts: [artifactId],
        incompleteMilestones: [artifactId],
      };

      return {
        valid: false,
        message: `Milestone ${artifactId} created, but requires at least 1 issue.`,
        actions,
        context: newContext,
      };
    }

    // Milestone has issues - valid!
    return {
      valid: true,
      message: `Milestone ${artifactId} created successfully with ${issues.length} issue(s).`,
      actions: [
        { label: "Finish", type: "finish" },
        {
          label: `Add another issue to ${artifactId}`,
          type: "add_issue",
          targetParent: artifactId,
          targetType: "issue",
        },
      ],
      context: context || {
        rootArtifactId: artifactId,
        rootArtifactType: "milestone",
        createdArtifacts: [artifactId, ...issues],
        incompleteMilestones: [],
      },
    };
  }

  /**
   * Handle initiative validation (requires ≥1 milestone with ≥1 issue each)
   */
  private async handleInitiativeValidation(
    artifactId: string,
    context?: BatchCreationContext,
  ): Promise<HierarchyValidationResult> {
    // Check if initiative has any milestones
    const milestones = await this.getChildrenIds(artifactId);

    if (milestones.length === 0) {
      // Initiative needs at least one milestone
      const actions: NextStepAction[] = [
        {
          label: `Add FIRST milestone to ${artifactId}`,
          type: "add_milestone",
          targetParent: artifactId,
          targetType: "milestone",
          isRequired: true,
        },
      ];

      const newContext: BatchCreationContext = {
        rootArtifactId: artifactId,
        rootArtifactType: "initiative",
        createdArtifacts: [artifactId],
        incompleteMilestones: [],
      };

      return {
        valid: false,
        message: `Initiative ${artifactId} created, but requires at least 1 milestone (each with ≥1 issue).`,
        actions,
        context: newContext,
      };
    }

    // Check which milestones have issues
    const incompleteMilestones: string[] = [];
    for (const milestoneId of milestones) {
      const issues = await this.getChildrenIds(milestoneId);
      if (issues.length === 0) {
        incompleteMilestones.push(milestoneId);
      }
    }

    if (incompleteMilestones.length > 0) {
      // Some milestones need issues
      const actions: NextStepAction[] = [
        {
          label: `Add FIRST issue to ${incompleteMilestones[0]}`,
          type: "add_issue",
          targetParent: incompleteMilestones[0],
          targetType: "issue",
          isRequired: true,
        },
        {
          label: `Add another milestone to ${artifactId}`,
          type: "add_milestone",
          targetParent: artifactId,
          targetType: "milestone",
        },
      ];

      const newContext: BatchCreationContext = context || {
        rootArtifactId: artifactId,
        rootArtifactType: "initiative",
        createdArtifacts: [artifactId, ...milestones],
        incompleteMilestones,
      };

      return {
        valid: false,
        message: `Initiative ${artifactId} has ${milestones.length} milestone(s), but ${incompleteMilestones.length} still need issues.`,
        actions,
        context: newContext,
      };
    }

    // All milestones have issues - initiative is valid!
    const actions: NextStepAction[] = [
      {
        label: "Finish (hierarchy is valid)",
        type: "finish",
      },
      {
        label: `Add another milestone to ${artifactId}`,
        type: "add_milestone",
        targetParent: artifactId,
        targetType: "milestone",
      },
    ];

    return {
      valid: true,
      message: `Initiative ${artifactId} created successfully with ${milestones.length} milestone(s), all with issues.`,
      actions,
      context: context || {
        rootArtifactId: artifactId,
        rootArtifactType: "initiative",
        createdArtifacts: [artifactId, ...milestones],
        incompleteMilestones: [],
      },
    };
  }

  /**
   * Get parent ID from child ID (A.1 → A, A.1.2 → A.1)
   */
  private getParentId(childId: string): string {
    const parts = childId.split(".");
    if (parts.length === 1) {
      throw new Error(`Cannot get parent of root artifact: ${childId}`);
    }
    return parts.slice(0, -1).join(".");
  }

  /**
   * Get all child artifact IDs for a parent
   *
   * @param parentId - Parent artifact ID
   * @returns Array of child IDs
   */
  private async getChildrenIds(parentId: string): Promise<string[]> {
    try {
      const children = await this.queryService.getChildren(parentId);
      return children.map((artifact) => artifact.id);
    } catch (_error) {
      // If getChildren fails, return empty array
      return [];
    }
  }
}
