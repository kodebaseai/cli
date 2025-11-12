import { Box, Newline, Text, useInput } from "ink";
import type { FC } from "react";
import { useEffect, useState } from "react";
import { TutorialFlow } from "../components/tutorial/TutorialFlow.js";
import type { TutorialCommandProps } from "../types/command.js";

/**
 * Tutorial Command Component
 *
 * Implements the 'kodebase tutorial' command for guided onboarding of new users.
 *
 * Command syntax: `kodebase tutorial`
 *
 * @description
 * This command provides an interactive tutorial that teaches users:
 * - Core kodebase concepts and terminology
 * - Artifact creation workflow (Initiative → Milestone → Issue)
 * - Git integration patterns
 * - Essential CLI commands
 * All performed in a safe sandbox environment that doesn't affect real projects.
 *
 * @example
 * ```bash
 * kodebase tutorial     # Start interactive tutorial
 * kb tutorial           # Same command with alias
 * ```
 *
 * **Tutorial Features:**
 * - Safe sandbox environment for experimentation
 * - Step-by-step guidance through core workflows
 * - Progress tracking and resumable sessions
 * - Automatic cleanup on completion
 */
export const Tutorial: FC<TutorialCommandProps> = ({ verbose }) => {
  const [isStarted, setIsStarted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === "c")) {
      setIsExiting(true);
      process.exit(0);
    }
    if (!isStarted && (input === "y" || key.return)) {
      setIsStarted(true);
    }
    if (!isStarted && input === "n") {
      setIsExiting(true);
      process.exit(0);
    }
  });

  useEffect(() => {
    if (isExiting) {
      process.exit(0);
    }
  }, [isExiting]);

  if (!isStarted) {
    return (
      <Box flexDirection="column">
        <Newline />
        <Text bold color="cyan">
          Welcome to Kodebase Tutorial! 🎓
        </Text>

        <Newline />
        <Text>
          This interactive tutorial will guide you through the core concepts
        </Text>
        <Text>of Kodebase hands-on. You'll learn:</Text>
        <Text color="green">
          {" "}
          • Creating initiatives, milestones, and issues
        </Text>
        <Text color="green"> • Understanding artifact relationships</Text>
        <Text color="green"> • Git workflow integration</Text>
        <Text color="green"> • Essential CLI commands</Text>
        <Newline />
        <Text color="yellow">
          📁 Creates demo artifacts in .kodebase/artifacts/X.*
        </Text>
        <Newline />
        <Text color="gray">
          You can explore them after completion or delete them anytime.
        </Text>
        <Newline />
        <Text bold>Ready to start? (Y/n)</Text>
        <Newline />
        <Text color="gray">Press Escape or Ctrl+C to exit anytime</Text>
      </Box>
    );
  }

  return <TutorialFlow verbose={verbose} />;
};
