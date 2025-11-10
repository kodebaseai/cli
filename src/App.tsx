/**
 * Root application component for Kodebase CLI
 *
 * Handles command routing and global error boundaries
 */

import { Box, Text } from "ink";
import type { FC } from "react";
import { ErrorHandler, Help, Version } from "./components/index.js";

export interface AppProps {
  /** Command line arguments (excluding node and script path) */
  args: string[];
  /** Enable verbose output */
  verbose?: boolean;
}

export const App: FC<AppProps> = ({ args, verbose = false }) => {
  const [command] = args;

  // Handle version command
  if (command === "version" || command === "--version" || command === "-v") {
    return <Version />;
  }

  // Handle help command
  if (
    command === "help" ||
    command === "--help" ||
    command === "-h" ||
    !command
  ) {
    return <Help />;
  }

  // Unknown command - show error and help
  const unknownCommandError = new Error(`Unknown command: ${command}`);

  return (
    <Box flexDirection="column">
      <ErrorHandler error={unknownCommandError} verbose={verbose} />
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Run 'kb --help' to see available commands
        </Text>
      </Box>
    </Box>
  );
};
