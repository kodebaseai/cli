import { CArtifactEvent } from "@kodebase/core";
import { Box, Newline, Text, useInput } from "ink";
import type { FC } from "react";
import { useEffect, useState } from "react";
import {
  createTutorialInitiative,
  createTutorialIssue,
  createTutorialMilestone,
  demonstrateGitWorkflow,
  INITIATIVE_ID,
  INITIATIVE_TITLE,
  ISSUE_ID,
  ISSUE_TITLE,
  MILESTONE_ID,
  MILESTONE_TITLE,
} from "../../utils/tutorial-artifact-creator.js";
import type { TutorialState, TutorialStepType } from "./types.js";
import { TUTORIAL_STEP_INFO } from "./types.js";

export interface TutorialStepProps {
  step: TutorialStepType;
  tutorialState: TutorialState;
  onNext: () => void;
  onBack: () => void;
  verbose?: boolean;
}

/**
 * Individual Tutorial Step Component
 *
 * Renders content and handles interaction for a specific tutorial step.
 * Each step teaches specific concepts and may include interactive exercises.
 */
export const TutorialStep: FC<TutorialStepProps> = ({
  step,
  tutorialState,
  onNext,
  onBack,
  verbose: _verbose = false,
}) => {
  const [isWaitingForInput, setIsWaitingForInput] = useState(true);
  const [stepStatus, setStepStatus] = useState<
    "waiting" | "creating" | "completed" | "error"
  >("waiting");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const stepInfo = TUTORIAL_STEP_INFO[step];

  // Reset step status when navigating to a new step
  // biome-ignore lint/correctness/useExhaustiveDependencies: We need to track step
  useEffect(() => {
    setStepStatus("waiting");
    setStatusMessage("");
    setIsWaitingForInput(true);
  }, [step]);

  const handleArtifactCreation = async () => {
    if (
      ![
        "create-initiative",
        "create-milestone",
        "create-issue",
        "git-integration",
      ].includes(step)
    ) {
      return;
    }

    setStepStatus("creating");
    setIsWaitingForInput(false);

    try {
      let result: { success: boolean; error?: string } | undefined;

      switch (step) {
        case "create-initiative":
          result = await createTutorialInitiative(
            tutorialState.sandboxPath,
            "Build my first web app",
          );
          break;
        case "create-milestone":
          result = await createTutorialMilestone(
            tutorialState.sandboxPath,
            "User authentication system",
            "X",
          );
          break;
        case "create-issue":
          result = await createTutorialIssue(
            tutorialState.sandboxPath,
            "Implement login endpoint",
            "X.1",
          );
          break;
        case "git-integration":
          result = await demonstrateGitWorkflow(tutorialState.sandboxPath);
          break;
      }

      if (result?.success) {
        if (step === "git-integration") {
          setStatusMessage("✅ Git workflow demonstrated successfully!");
        } else {
          setStatusMessage(`✅ Created ${step.split("-")[1]} successfully!`);
        }
        setStepStatus(CArtifactEvent.COMPLETED);
      } else {
        setStepStatus("error");
        if (step === "git-integration") {
          setStatusMessage(`❌ Git workflow demo failed: ${result?.error}`);
        } else {
          setStatusMessage(
            `❌ Failed to create ${step.split("-")[1]}: ${result?.error}`,
          );
        }
      }
    } catch (error) {
      setStepStatus("error");
      setStatusMessage(
        `❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    setTimeout(() => {
      setIsWaitingForInput(true);
    }, 2000); // Allow user to read the result
  };

  useInput((input, key) => {
    if (!isWaitingForInput) return;

    // Handle creation steps
    if (
      [
        "create-initiative",
        "create-milestone",
        "create-issue",
        "git-integration",
      ].includes(step) &&
      stepStatus === "waiting"
    ) {
      if (key.return || input === "c") {
        handleArtifactCreation();
        return;
      }
    }

    // Handle navigation
    if (key.return || input === "n") {
      onNext();
    }
    if (input === "b" && stepInfo.canGoBack) {
      onBack();
    }
  });

  const renderStepContent = () => {
    switch (step) {
      case "welcome":
        return (
          <Box flexDirection="column">
            <Text bold color="cyan">
              {stepInfo.title}
            </Text>
            <Newline />

            <Text>In the next few minutes, you'll learn:</Text>
            <Text color="green">
              • Core kodebase concepts (Initiatives, Milestones, Issues)
            </Text>
            <Text color="green">• How to create and manage artifacts</Text>
            <Text color="green">• Git workflow integration</Text>
            <Text color="green">• Essential CLI commands</Text>
            <Newline />

            <Text color="yellow" bold>
              🔧 Sandbox Environment:
            </Text>
            <Text>
              Everything happens in the{" "}
              <Text color="gray" bold italic>
                .kodebase/artifacts/
              </Text>{" "}
              folder, so you can check what we are creating. This will be
              cleaned up automatically when you finish.
            </Text>
          </Box>
        );

      case "concepts":
        return (
          <Box flexDirection="column">
            <Text bold color="cyan">
              {stepInfo.title}
            </Text>
            <Newline />

            <Text bold>The Kodebase Hierarchy:</Text>
            <Text>
              <Text color="blue" bold>
                📋 Initiative:
              </Text>
              <Text color="gray">
                Large project or goal (e.g., "Build user authentication")
              </Text>
            </Text>
            <Text>
              <Text color="blue" bold>
                🎯 Milestone:
              </Text>
              <Text color="gray">
                Major deliverable (e.g., "API endpoints")
              </Text>
            </Text>
            <Text>
              <Text color="blue" bold>
                📝 Issue:
              </Text>
              <Text color="gray">
                Specific task (e.g., "Implement login endpoint")
              </Text>
            </Text>
            <Newline />

            <Text bold>Key Benefits:</Text>
            <Text>
              <Text bold color="green">
                • Structure:{" "}
              </Text>{" "}
              Break big projects into manageable pieces
            </Text>
            <Text>
              <Text bold color="green">
                • Tracking:{" "}
              </Text>{" "}
              Clear progress and status for everything
            </Text>
            <Text>
              <Text bold color="green">
                • Git Integration:{" "}
              </Text>{" "}
              Automatic branch and PR management
            </Text>
            <Text>
              <Text bold color="green">
                • Documentation:{" "}
              </Text>{" "}
              Everything is documented as you work
            </Text>
          </Box>
        );

      case "create-initiative":
        return (
          <Box flexDirection="column">
            <Text bold color="cyan">
              {stepInfo.title}
            </Text>
            <Newline />

            <Text>
              Let's create your first Initiative! An initiative represents a
              large project or goal you want to accomplish.
            </Text>
            <Newline />

            {stepStatus === "waiting" && (
              <>
                <Box gap={1}>
                  <Text bold>Ready to create initiative:</Text>
                  <Text color="green">"Build my first web app"</Text>
                </Box>
                <Newline />

                <Text color="yellow" bold>
                  💡 What this will do:
                </Text>
                <Text>• Creates a new Initiative with ID {INITIATIVE_ID}</Text>
                <Text>• Generates proper YAML structure</Text>
                <Text>• Sets up the artifact hierarchy</Text>
                <Text>• Adds initial "draft" event</Text>
                <Newline />

                <Text bold color="cyan">
                  Press Enter or 'c' to create the initiative!
                </Text>
              </>
            )}

            {stepStatus === "creating" && (
              <Text color="yellow">🔧 Creating initiative...</Text>
            )}

            {stepStatus === CArtifactEvent.COMPLETED && (
              <>
                <Text>
                  ✅ Your first Initiative is ready! It's stored in
                  <Text color="gray" bold italic>
                    .kodebase/artifacts/
                  </Text>
                </Text>
                <Text>
                  You now have Initiative "{INITIATIVE_ID}: {INITIATIVE_TITLE}"
                </Text>
              </>
            )}

            {stepStatus === "error" && <Text color="red">{statusMessage}</Text>}
            <Newline />

            <Text color="gray">
              {"("}In a real project, you'd run:{" "}
              <Text bold italic>
                kodebase add "{INITIATIVE_TITLE}"
              </Text>
            </Text>
          </Box>
        );

      case "create-milestone":
        return (
          <Box flexDirection="column">
            <Text bold color="cyan">
              {stepInfo.title}
            </Text>
            <Newline />

            <Text>
              Great! Now let's add a Milestone under your Initiative. Milestones
              represent major deliverables or phases.
            </Text>
            <Newline />

            {stepStatus === "waiting" && (
              <>
                <Text>
                  <Text bold>Ready to create milestone:</Text>{" "}
                  <Text color="green">{MILESTONE_TITLE}</Text>{" "}
                  <Text color="gray">under Initiative {INITIATIVE_ID}</Text>
                </Text>
                <Newline />
                <Text color="yellow" bold>
                  💡 What this will do:
                </Text>
                <Text>
                  • Creates Milestone "{MILESTONE_ID}" under Initiative "
                  {INITIATIVE_ID}"
                </Text>
                <Text>• Sets up parent-child relationship</Text>
                <Text>• Creates milestone-specific directory</Text>
                <Text>• Tracks dependencies automatically</Text>
                <Newline />

                <Text bold color="cyan">
                  Press Enter or 'c' to create the milestone!
                </Text>
              </>
            )}

            {stepStatus === "creating" && (
              <Text color="yellow">🔧 Creating milestone...</Text>
            )}

            {stepStatus === CArtifactEvent.COMPLETED && (
              <>
                <Text>🎉 Your milestone is ready!</Text>
                <Newline />
                <Text>Current structure:</Text>
                <Text color="blue">
                  {INITIATIVE_ID}: "{INITIATIVE_TITLE}" (Initiative)
                </Text>
                <Text color="green">
                  └─ {MILESTONE_ID}: "{MILESTONE_TITLE}" (Milestone)
                </Text>
              </>
            )}

            {stepStatus === "error" && <Text color="red">{statusMessage}</Text>}
            <Newline />

            <Text color="gray">
              {"("}In a real project, you'd run:{" "}
              <Text bold italic>
                kodebase create {INITIATIVE_ID} "{MILESTONE_TITLE}"
              </Text>
              {")"}
            </Text>
          </Box>
        );

      case "create-issue":
        return (
          <Box flexDirection="column">
            <Text bold color="cyan">
              {stepInfo.title}
            </Text>
            <Newline />

            <Text>
              Perfect! Now let's create an Issue - the actual work item that
              someone will implement.
            </Text>
            <Newline />

            {stepStatus === "waiting" && (
              <>
                <Text bold>Ready to create issue:</Text>
                <Text color="green">{ISSUE_TITLE}</Text>
                <Text color="gray">under Milestone {MILESTONE_ID}</Text>
                <Newline />

                <Text color="yellow">💡 What this will do:</Text>
                <Text>
                  • Creates Issue "{ISSUE_ID}" under Milestone "{MILESTONE_ID}"
                </Text>
                <Text>• Completes the three-level hierarchy</Text>
                <Text>• Sets up work tracking structure</Text>
                <Text>• Prepares for Git workflow integration</Text>
                <Newline />

                <Text bold color="cyan">
                  Press Enter or 'c' to create the issue!
                </Text>
              </>
            )}

            {stepStatus === "creating" && (
              <Text color="yellow">🔧 Creating issue...</Text>
            )}

            {stepStatus === CArtifactEvent.COMPLETED && (
              <>
                <Text>🎉 Complete project structure created!</Text>
                <Newline />

                <Text>Your full hierarchy:</Text>
                <Text color="blue">
                  {INITIATIVE_ID}: "{INITIATIVE_TITLE}" (Initiative)
                </Text>
                <Text color="green">
                  └─ {MILESTONE_ID}: "{MILESTONE_TITLE}" (Milestone)
                </Text>
                <Text color="yellow">
                  {"   "}
                  └─ {ISSUE_ID}: {ISSUE_TITLE} (Issue)
                </Text>
                <Newline />

                <Text>
                  ✨ You now have a complete kodebase project structure!
                </Text>
              </>
            )}

            {stepStatus === "error" && <Text color="red">{statusMessage}</Text>}
            <Newline />

            <Text color="gray">
              {"("}In a real project, you'd run:{" "}
              <Text bold italic>
                kodebase create {ISSUE_ID} "{ISSUE_TITLE}"
              </Text>
              {")"}
            </Text>
          </Box>
        );

      case "git-integration":
        return (
          <Box flexDirection="column">
            <Text bold color="cyan">
              {stepInfo.title}
            </Text>
            <Newline />

            <Text>Now for the powerful part - Git integration! Let's</Text>
            <Text>demonstrate how kodebase manages workflow for you.</Text>
            <Newline />

            {stepStatus === "waiting" && (
              <>
                <Text bold>Ready to demonstrate Git workflow:</Text>
                <Text color="green">
                  Making {ISSUE_ID} ready and creating branch
                </Text>
                <Newline />

                <Text color="yellow">💡 What this will do:</Text>
                <Text>• Mark issue {ISSUE_ID} as ready for development</Text>
                <Text>• Create feature branch "{ISSUE_ID}"</Text>
                <Text>• Update artifact status to "in_progress"</Text>
                <Text>• Show you the complete workflow</Text>
                <Newline />

                <Text bold color="cyan">
                  Press Enter or 'c' to demonstrate Git workflow!
                </Text>
              </>
            )}

            {stepStatus === "creating" && (
              <Text color="yellow">
                🔧 Running Git workflow demonstration...
              </Text>
            )}

            {stepStatus === CArtifactEvent.COMPLETED && (
              <>
                <Text bold>Key Commands You Just Learned:</Text>
                <Text color="green">kodebase start {ISSUE_ID}</Text>
                <Text color="gray"> ├─ Start work on issue {ISSUE_ID}</Text>
                <Text color="gray">
                  {" "}
                  ├─ Creates a new branch with name {ISSUE_ID}
                </Text>
                <Text color="gray">
                  {" "}
                  ├─ Adds a "in progres" event to the artifact {ISSUE_ID}
                </Text>
                <Text color="gray">
                  {" "}
                  └─ Submits a DRAFT PR, to let your team know you're starting{" "}
                  {ISSUE_ID}
                </Text>
                <Newline />

                <Text color="green">kodebase start {ISSUE_ID} --submit</Text>
                <Text color="gray"> ├─ Validates your artifacts</Text>
                <Text color="gray"> ├─ Verifies the work</Text>
                <Text color="gray">
                  {" "}
                  ├─ Add a "in review" event to the artifact
                </Text>
                <Text color="gray">
                  {" "}
                  └─ Updates the PR descriptio and set it to ready for review
                </Text>
                <Newline />

                <Text color="yellow">💡 The Magic:</Text>
                <Newline />
                <Text>• Branch names match artifact IDs</Text>
                <Text>• Status updates happen automatically</Text>
                <Text>• Everything stays in sync with Git</Text>
              </>
            )}

            {stepStatus === "error" && <Text color="red">{statusMessage}</Text>}
            <Newline />

            <Text color="gray">
              {"("}In a real project, you'd run:{" "}
              <Text bold italic>
                kodebase start {ISSUE_ID}
              </Text>
              {")"}
            </Text>
          </Box>
        );

      case "completion":
        return (
          <Box flexDirection="column">
            <Text bold color="cyan">
              {stepInfo.title}
            </Text>
            <Newline />

            {/* Achievement Certificate */}
            <Box
              flexDirection="column"
              borderStyle="round"
              borderColor="green"
              paddingX={2}
              paddingY={1}
              marginBottom={1}
            >
              <Text bold color="green">
                🏆 KODEBASE TUTORIAL COMPLETED 🏆
              </Text>
              <Newline />

              <Text color="cyan">Certificate of Achievement</Text>
              <Text>
                You have successfully mastered the fundamentals of the Kodebase
                methodology and CLI.
              </Text>
              <Newline />

              <Text bold>Skills Acquired:</Text>
              <Text color="green">✓ Artifact creation and management</Text>
              <Text color="green">✓ Project structure organization</Text>
              <Text color="green">✓ Git workflow integration</Text>
              <Text color="green">✓ CLI command proficiency</Text>
              <Newline />

              <Text italic color="gray">
                Ready to build amazing projects! 🚀
              </Text>
            </Box>

            <Text bold color="green">
              What you learned:
            </Text>
            <Text>✓ Core concepts: Initiatives, Milestones, Issues</Text>
            <Text>✓ Creating artifacts with the CLI</Text>
            <Text>✓ Understanding parent-child relationships</Text>
            <Text>✓ Git workflow integration patterns</Text>
            <Text>✓ Essential commands for daily use</Text>
            <Newline />

            <Text bold color="cyan">
              🚀 Ready to Start Your First Real Project?
            </Text>
            <Text bold color="yellow">
              Step 1: Initialize Your Project
            </Text>
            <Text color="green">cd your-project-directory</Text>
            <Text color="green">kodebase init</Text>
            <Text color="gray"> └─ Sets up .kodebase/ directory structure</Text>
            <Newline />

            <Text bold color="yellow">
              Step 2: Create Your First Real Initiative
            </Text>
            <Text color="green">kodebase add "Your project idea"</Text>
            <Text color="gray"> └─ Creates Initiative A with your idea</Text>
            <Newline />

            <Text bold color="yellow">
              Step 3: Break It Down
            </Text>
            <Text color="green">kodebase add A "First milestone"</Text>
            <Text color="green">kodebase add A.1 "First task"</Text>
            <Text color="gray"> └─ Build your project hierarchy</Text>
            <Newline />

            <Text bold color="yellow">
              Step 4: Start Working
            </Text>
            <Text color="green">kodebase start A.1.1</Text>
            <Text color="gray"> └─ Begin your first real implementation</Text>
            <Newline />

            <Text bold color="cyan">
              📚 Learn More:
            </Text>
            <Text>• Run "kodebase --help" for all commands</Text>
            <Text>• Use "kb" shortcut for faster workflow</Text>
            <Text>• Check docs for advanced features</Text>
            <Text>• Join the community for tips and tricks</Text>
            <Newline />

            <Text bold color="yellow">
              💡 Quick Reference:
            </Text>
            <Text>kb add "idea" - Add new artifact</Text>
            <Text>kb start ID - Begin implementation</Text>
            <Text>kb list - Show all artifacts</Text>
            <Text>kb status ID - Check progress</Text>
            <Text>
              kb validate {"<"}optional ID{">"} - Validates Artifact
            </Text>
            <Newline />

            <Text color="green">🧹 Tutorial Environment Cleanup:</Text>
            <Text>• Sandbox directory will be removed automatically</Text>
            <Text>• All temporary files and artifacts will be cleaned up</Text>
            <Text>• Your system remains clean and unaffected</Text>
            <Newline />

            <Text color="gray">
              Safe to exit - cleanup happens automatically on tutorial
              completion
            </Text>
          </Box>
        );

      default:
        return (
          <Box>
            <Text color="red">Unknown tutorial step: {step}</Text>
          </Box>
        );
    }
  };

  const getNavigationText = () => {
    if (
      [
        "create-initiative",
        "create-milestone",
        "create-issue",
        "git-integration",
      ].includes(step)
    ) {
      if (stepStatus === "waiting") {
        const action = step === "git-integration" ? "demonstrate" : "create";
        return `Press Enter or 'c' to ${action} • ${stepInfo.canGoBack ? "Press 'b' to go Back" : ""}`;
      }
      if (stepStatus === CArtifactEvent.COMPLETED) {
        return `Press Enter or 'n' for Next${stepInfo.canGoBack ? " • Press 'b' to go Back" : ""}`;
      }
      if (stepStatus === "creating") {
        const action =
          step === "git-integration"
            ? "Demonstrating workflow..."
            : "Creating artifact...";
        return action;
      }
      if (stepStatus === "error") {
        return `Press Enter or 'n' to continue${stepInfo.canGoBack ? " • Press 'b' to go Back" : ""}`;
      }
    }

    return `Press Enter or 'n' for Next${stepInfo.canGoBack ? " • Press 'b' to go Back" : ""}`;
  };

  return (
    <Box flexDirection="column">
      {renderStepContent()}

      <Box marginTop={2}>
        <Text color="gray">{getNavigationText()}</Text>
      </Box>
    </Box>
  );
};
