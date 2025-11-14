/**
 * Completion Step
 *
 * Final step of setup wizard - shows success message and next steps
 */

import { Box, Text, useInput } from "ink";
import type { FC } from "react";

interface CompletionStepProps {
  presetName: "solo" | "small_team" | "enterprise";
  onComplete: () => void;
}

/**
 * Completion Step
 *
 * Shows success message and guides user to next steps:
 * - Create first artifact with `kb add`
 * - Run interactive tutorial with `kb tutorial`
 * - Link to documentation
 */
export const CompletionStep: FC<CompletionStepProps> = ({
  presetName,
  onComplete,
}) => {
  useInput((_, key) => {
    if (key.return) {
      onComplete();
    }
  });

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color="green">
          ✓ Setup complete!
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text>
          Kodebase is configured with the{" "}
          <Text bold color="cyan">
            {presetName}
          </Text>{" "}
          preset.
        </Text>
      </Box>

      <Box marginBottom={1} marginTop={1}>
        <Text bold>Next steps:</Text>
      </Box>

      <Box marginLeft={2} marginBottom={1} flexDirection="column">
        <Text>
          • Create an artifact:{" "}
          <Text bold color="cyan">
            kb add
          </Text>
        </Text>
        <Text>
          • Run interactive tutorial:{" "}
          <Text bold color="cyan">
            kb tutorial
          </Text>
        </Text>
        <Text>
          • View all commands:{" "}
          <Text bold color="cyan">
            kb help
          </Text>
        </Text>
      </Box>

      <Box marginBottom={1} marginTop={1}>
        <Text bold>Quick workflow:</Text>
      </Box>

      <Box marginLeft={2} marginBottom={1} flexDirection="column">
        <Text dimColor>1. Create initiative: kb add</Text>
        <Text dimColor>2. Create milestone: kb add A</Text>
        <Text dimColor>3. Create issue: kb add A.1</Text>
        <Text dimColor>4. Start work: kb start A.1.1</Text>
        <Text dimColor>5. Make changes and commit</Text>
        <Text dimColor>6. Submit PR: kb start A.1.1 --submit</Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Documentation: https://docs.kodebase.ai/git-ops</Text>
      </Box>

      <Box marginTop={2}>
        <Text>
          Press{" "}
          <Text bold color="green">
            Enter
          </Text>{" "}
          to exit
        </Text>
      </Box>
    </Box>
  );
};
