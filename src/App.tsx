/**
 * Root application component for Kodebase CLI
 *
 * Handles command routing and global error boundaries
 */

import type { TArtifactEvent } from "@kodebase/core";
import { Box, Text } from "ink";
import type { FC } from "react";
import { Context } from "./commands/Context.js";
import { Start } from "./commands/Start.js";
import { Status } from "./commands/Status.js";
import { Validate } from "./commands/Validate.js";
import { ErrorHandler, Help, Version } from "./components/index.js";

export interface AppProps {
  /** Command line arguments (excluding node and script path) */
  args: string[];
  /** Enable verbose output */
  verbose?: boolean;
}

export const App: FC<AppProps> = ({ args, verbose = false }) => {
  const [command, ...commandArgs] = args;

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

  // Handle start command
  if (command === "start") {
    // Parse artifact ID (first non-flag argument)
    const artifactId = commandArgs.find((arg) => !arg.startsWith("--"));

    // Parse flags
    const submit = commandArgs.includes("--submit");

    // Validate: artifact ID is required
    if (!artifactId) {
      return (
        <Box flexDirection="column">
          <ErrorHandler
            error={new Error("Artifact ID is required")}
            verbose={verbose}
          />
          <Box marginTop={1}>
            <Text color="gray" dimColor>
              Usage: kb start &lt;artifact-id&gt; [--submit]
            </Text>
          </Box>
        </Box>
      );
    }

    return <Start artifactId={artifactId} submit={submit} verbose={verbose} />;
  }

  // Handle status command
  if (command === "status") {
    // Parse artifact ID (first non-flag argument)
    const artifactId = commandArgs.find((arg) => !arg.startsWith("--"));

    // Parse flags
    const all = commandArgs.includes("--all");
    const json = commandArgs.includes("--json");

    // Parse state filter (--state=value or --status=value)
    const stateArg = commandArgs.find(
      (arg) => arg.startsWith("--state=") || arg.startsWith("--status="),
    );
    const state = stateArg?.split("=")[1] as TArtifactEvent | undefined;

    // Parse assignee filter (--assignee=value)
    const assigneeArg = commandArgs.find((arg) =>
      arg.startsWith("--assignee="),
    );
    const assignee = assigneeArg?.split("=")[1];

    // Validate: either artifactId or --all must be provided
    if (!artifactId && !all) {
      return (
        <Box flexDirection="column">
          <ErrorHandler
            error={
              new Error("Either artifact ID or --all flag must be provided")
            }
            verbose={verbose}
          />
          <Box marginTop={1}>
            <Text color="gray" dimColor>
              Usage: kb status &lt;artifact-id&gt; [--json]
            </Text>
            <Text color="gray" dimColor>
              Or: kb status --all [--status=&lt;state&gt;]
              [--assignee=&lt;name&gt;] [--json]
            </Text>
          </Box>
        </Box>
      );
    }

    return (
      <Status
        artifactId={artifactId}
        all={all}
        format={json ? "json" : "formatted"}
        state={state}
        assignee={assignee}
        verbose={verbose}
      />
    );
  }

  // Handle validate command
  if (command === "validate") {
    // Parse artifact ID (first non-flag argument)
    const artifactId = commandArgs.find((arg) => !arg.startsWith("--"));

    // Parse flags
    const fix = commandArgs.includes("--fix");
    const strict = commandArgs.includes("--strict");
    const json = commandArgs.includes("--json");

    return (
      <Validate
        artifactId={artifactId}
        fix={fix}
        strict={strict}
        format={json ? "json" : "formatted"}
        verbose={verbose}
      />
    );
  }

  // Handle context command (ctx alias)
  if (command === "context" || command === "ctx") {
    // Parse artifact ID (first non-flag argument)
    const artifactId = commandArgs.find((arg) => !arg.startsWith("--"));

    // Parse flags
    const copy = commandArgs.includes("--copy");

    // Parse format flag (--format=value)
    const formatArg = commandArgs.find((arg) => arg.startsWith("--format="));
    const format = formatArg?.split("=")[1] as
      | "standard"
      | "compact"
      | "detailed"
      | undefined;

    // Parse output flag (--output=value)
    const outputArg = commandArgs.find((arg) => arg.startsWith("--output="));
    const output = outputArg?.split("=")[1];

    // Validate: artifact ID is required
    if (!artifactId) {
      return (
        <Box flexDirection="column">
          <ErrorHandler
            error={new Error("Artifact ID is required")}
            verbose={verbose}
          />
          <Box marginTop={1}>
            <Text color="gray" dimColor>
              Usage: kb ctx &lt;artifact-id&gt;
              [--format=standard|compact|detailed] [--copy] [--output=file.md]
            </Text>
          </Box>
        </Box>
      );
    }

    // Validate format value if provided
    if (format && !["standard", "compact", "detailed"].includes(format)) {
      return (
        <Box flexDirection="column">
          <ErrorHandler
            error={
              new Error(
                `Invalid format: ${format}. Must be one of: standard, compact, detailed`,
              )
            }
            verbose={verbose}
          />
        </Box>
      );
    }

    return (
      <Context
        artifactId={artifactId}
        format={format}
        copy={copy}
        output={output}
        verbose={verbose}
      />
    );
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
