/**
 * Root application component for Kodebase CLI
 *
 * Handles command routing and global error boundaries
 */

import type { TArtifactEvent } from "@kodebase/core";
import { Box, Text } from "ink";
import type { FC } from "react";
import { Add } from "./commands/Add.js";
import { Context } from "./commands/Context.js";
import { Hooks } from "./commands/Hooks.js";
import { Setup } from "./commands/Setup.js";
import { Start } from "./commands/Start.js";
import { Status } from "./commands/Status.js";
import { Tutorial } from "./commands/Tutorial.js";
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
    // Check if user wants help for a specific command (e.g., kb help start)
    const helpCommand = commandArgs.find((arg) => !arg.startsWith("--"));
    return <Help command={helpCommand} />;
  }

  // Handle add command
  if (command === "add") {
    // Parse flags
    const submit = commandArgs.includes("--submit");

    // Note: All arguments (excluding flags) are passed to Add component
    // The Add component handles mode detection (wizard vs direct)
    return <Add args={commandArgs} submit={submit} verbose={verbose} />;
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

  // Handle tutorial command
  if (command === "tutorial") {
    return <Tutorial verbose={verbose} />;
  }

  // Handle setup command
  if (command === "setup") {
    // Parse preset flag (--preset=value)
    const presetArg = commandArgs.find((arg) => arg.startsWith("--preset="));
    const preset = presetArg?.split("=")[1] as
      | "solo"
      | "small_team"
      | "enterprise"
      | undefined;

    // Validate preset value if provided
    if (preset && !["solo", "small_team", "enterprise"].includes(preset)) {
      return (
        <Box flexDirection="column">
          <ErrorHandler
            error={
              new Error(
                `Invalid preset: ${preset}. Must be one of: solo, small_team, enterprise`,
              )
            }
            verbose={verbose}
          />
        </Box>
      );
    }

    // Parse other flags
    const skipAuth = commandArgs.includes("--skip-auth");
    const skipHooks = commandArgs.includes("--skip-hooks");
    const force = commandArgs.includes("--force");

    return (
      <Setup
        preset={preset}
        skipAuth={skipAuth}
        skipHooks={skipHooks}
        force={force}
        verbose={verbose}
      />
    );
  }

  // Handle hooks command
  if (command === "hooks") {
    // Parse subcommand (first non-flag argument)
    const subcommand = commandArgs.find((arg) => !arg.startsWith("--"));

    // Validate: subcommand is required
    if (!subcommand) {
      return (
        <Box flexDirection="column">
          <ErrorHandler
            error={
              new Error("Subcommand is required (execute, install, uninstall)")
            }
            verbose={verbose}
          />
          <Box marginTop={1}>
            <Text color="gray" dimColor>
              Usage: kb hooks &lt;execute|install|uninstall&gt; [options]
            </Text>
          </Box>
        </Box>
      );
    }

    // Validate subcommand
    if (!["execute", "install", "uninstall"].includes(subcommand)) {
      return (
        <Box flexDirection="column">
          <ErrorHandler
            error={
              new Error(
                `Invalid subcommand: ${subcommand}. Must be one of: execute, install, uninstall`,
              )
            }
            verbose={verbose}
          />
        </Box>
      );
    }

    // Parse hook type (for execute subcommand)
    const hookType = commandArgs[commandArgs.indexOf(subcommand) + 1];

    // Validate: hook type is required for execute
    if (subcommand === "execute" && !hookType) {
      return (
        <Box flexDirection="column">
          <ErrorHandler
            error={new Error("Hook type is required for execute subcommand")}
            verbose={verbose}
          />
          <Box marginTop={1}>
            <Text color="gray" dimColor>
              Usage: kb hooks execute
              &lt;post-merge|post-checkout|post-commit&gt;
            </Text>
          </Box>
        </Box>
      );
    }

    // Parse flags
    const force = commandArgs.includes("--force");

    return (
      <Hooks
        subcommand={subcommand as "execute" | "install" | "uninstall"}
        hookType={hookType}
        force={force}
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
