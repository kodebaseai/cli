import { Box, Text } from "ink";
import type { FC } from "react";

export const Help: FC = () => {
  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>
        Kodebase CLI - Structured Knowledge Management
      </Text>
      <Text> </Text>

      <Text color="yellow" bold>
        Usage:
      </Text>
      <Box marginLeft={2}>
        <Text>
          <Text color="gray">$ </Text>
          <Text>kb [command] [options]</Text>
        </Text>
      </Box>
      <Text> </Text>

      <Text color="yellow" bold>
        Commands:
      </Text>
      <Box marginLeft={2} flexDirection="column">
        <Text>
          <Text color="green" bold>
            start &lt;artifact-id&gt;{" "}
          </Text>
          <Text color="gray">Start work on an artifact</Text>
        </Text>
        <Text>
          <Text color="green" bold>
            status &lt;artifact-id&gt;{" "}
          </Text>
          <Text color="gray">Display artifact status information</Text>
        </Text>
        <Text>
          <Text color="green" bold>
            validate [artifact-id]{" "}
          </Text>
          <Text color="gray">Validate artifacts for correctness</Text>
        </Text>
        <Text>
          <Text color="green" bold>
            ctx &lt;artifact-id&gt;{" "}
          </Text>
          <Text color="gray">Generate AI context from artifact</Text>
        </Text>
        <Text>
          <Text color="green" bold>
            version, --version, -v{" "}
          </Text>
          <Text color="gray">Display version information</Text>
        </Text>
        <Text>
          <Text color="green" bold>
            help, --help, -h{" "}
          </Text>
          <Text color="gray">Show this help message</Text>
        </Text>
      </Box>
      <Text> </Text>

      <Text color="yellow" bold>
        Options:
      </Text>
      <Box marginLeft={2} flexDirection="column">
        <Text>
          <Text color="cyan">--verbose </Text>
          <Text color="gray">
            Enable verbose output with detailed error messages
          </Text>
        </Text>
      </Box>
      <Text> </Text>

      <Text color="gray" dimColor>
        For more information, visit: https://github.com/kodebaseai/kodebase
      </Text>
    </Box>
  );
};
