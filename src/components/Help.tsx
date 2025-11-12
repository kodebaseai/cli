import { Box, Text } from "ink";
import type { FC } from "react";

export interface HelpProps {
  command?: string;
}

export const Help: FC<HelpProps> = ({ command }) => {
  // Show command-specific help if command is provided
  if (command) {
    return getCommandHelp(command);
  }

  // Show general help
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
            tutorial{" "}
          </Text>
          <Text color="gray">Interactive tutorial for new users</Text>
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
        For more information:
      </Text>
      <Box marginLeft={2} flexDirection="column">
        <Text color="gray">
          • kb help &lt;command&gt; - Get help for a specific command
        </Text>
        <Text color="gray">
          • kb tutorial - Interactive tutorial for new users
        </Text>
        <Text color="gray">• https://github.com/kodebaseai/kodebase</Text>
      </Box>
    </Box>
  );
};

function getCommandHelp(command: string): JSX.Element {
  switch (command.toLowerCase()) {
    case "start":
      return (
        <Box flexDirection="column">
          <Text color="cyan" bold>
            kb start - Start work on an artifact
          </Text>
          <Text> </Text>

          <Text color="yellow" bold>
            Usage:
          </Text>
          <Box marginLeft={2} flexDirection="column">
            <Text>
              <Text color="gray">$ </Text>
              <Text>kb start &lt;artifact-id&gt;</Text>
            </Text>
          </Box>
          <Text> </Text>

          <Text color="yellow" bold>
            Description:
          </Text>
          <Box marginLeft={2} flexDirection="column">
            <Text>
              Starts work on a specific artifact by creating a Git branch and
            </Text>
            <Text>transitioning the artifact to in_progress state.</Text>
          </Box>
          <Text> </Text>

          <Text color="yellow" bold>
            Examples:
          </Text>
          <Box marginLeft={2} flexDirection="column">
            <Text>
              <Text color="green">$ kb start A.1.1</Text>
              <Text color="gray"> - Start work on issue A.1.1</Text>
            </Text>
            <Text>
              <Text color="green">$ kb start B.2</Text>
              <Text color="gray"> - Start work on milestone B.2</Text>
            </Text>
          </Box>
          <Text> </Text>

          <Text color="yellow" bold>
            What happens:
          </Text>
          <Box marginLeft={2} flexDirection="column">
            <Text>• Creates a new Git branch based on artifact ID</Text>
            <Text>• Transitions artifact to in_progress state</Text>
            <Text>• Adds event to artifact history</Text>
            <Text>• Commits the state change to the new branch</Text>
          </Box>
          <Text> </Text>

          <Text color="gray">
            Related: kb status &lt;id&gt;, kb ctx &lt;id&gt;
          </Text>
        </Box>
      );

    case "status":
      return (
        <Box flexDirection="column">
          <Text color="cyan" bold>
            kb status - Display artifact status
          </Text>
          <Text> </Text>

          <Text color="yellow" bold>
            Usage:
          </Text>
          <Box marginLeft={2} flexDirection="column">
            <Text>
              <Text color="gray">$ </Text>
              <Text>kb status &lt;artifact-id&gt; [options]</Text>
            </Text>
            <Text>
              <Text color="gray">$ </Text>
              <Text>kb status --all [options]</Text>
            </Text>
          </Box>
          <Text> </Text>

          <Text color="yellow" bold>
            Description:
          </Text>
          <Box marginLeft={2} flexDirection="column">
            <Text>
              View detailed status information for artifacts including metadata,
            </Text>
            <Text>relationships, events, and current state.</Text>
          </Box>
          <Text> </Text>

          <Text color="yellow" bold>
            Options:
          </Text>
          <Box marginLeft={2} flexDirection="column">
            <Text>
              <Text color="cyan">--all </Text>
              <Text color="gray">List all artifacts in table format</Text>
            </Text>
            <Text>
              <Text color="cyan">--json </Text>
              <Text color="gray">Output in JSON format</Text>
            </Text>
            <Text>
              <Text color="cyan">--state &lt;state&gt; </Text>
              <Text color="gray">
                Filter by state (draft, ready, in_progress, blocked, completed)
              </Text>
            </Text>
            <Text>
              <Text color="cyan">--assignee &lt;email&gt; </Text>
              <Text color="gray">Filter by assignee</Text>
            </Text>
          </Box>
          <Text> </Text>

          <Text color="yellow" bold>
            Examples:
          </Text>
          <Box marginLeft={2} flexDirection="column">
            <Text>
              <Text color="green">$ kb status A.1.1</Text>
              <Text color="gray"> - Show detailed status for A.1.1</Text>
            </Text>
            <Text>
              <Text color="green">$ kb status --all</Text>
              <Text color="gray"> - List all artifacts</Text>
            </Text>
            <Text>
              <Text color="green">$ kb status --all --state in_progress</Text>
              <Text color="gray"> - Show in-progress items</Text>
            </Text>
            <Text>
              <Text color="green">$ kb status A --json</Text>
              <Text color="gray"> - Get status in JSON format</Text>
            </Text>
          </Box>
          <Text> </Text>

          <Text color="gray">Related: kb start &lt;id&gt;, kb validate</Text>
        </Box>
      );

    case "validate":
      return (
        <Box flexDirection="column">
          <Text color="cyan" bold>
            kb validate - Validate artifacts
          </Text>
          <Text> </Text>

          <Text color="yellow" bold>
            Usage:
          </Text>
          <Box marginLeft={2} flexDirection="column">
            <Text>
              <Text color="gray">$ </Text>
              <Text>kb validate [artifact-id] [options]</Text>
            </Text>
          </Box>
          <Text> </Text>

          <Text color="yellow" bold>
            Description:
          </Text>
          <Box marginLeft={2} flexDirection="column">
            <Text>
              Validates artifacts against schema requirements and business
              rules.
            </Text>
            <Text>
              Checks for missing fields, invalid references, and data integrity.
            </Text>
          </Box>
          <Text> </Text>

          <Text color="yellow" bold>
            Options:
          </Text>
          <Box marginLeft={2} flexDirection="column">
            <Text>
              <Text color="cyan">--json </Text>
              <Text color="gray">Output validation results in JSON format</Text>
            </Text>
            <Text>
              <Text color="cyan">--fix </Text>
              <Text color="gray">Automatically fix common issues</Text>
            </Text>
            <Text>
              <Text color="cyan">--strict </Text>
              <Text color="gray">Fail on warnings (not just errors)</Text>
            </Text>
          </Box>
          <Text> </Text>

          <Text color="yellow" bold>
            Examples:
          </Text>
          <Box marginLeft={2} flexDirection="column">
            <Text>
              <Text color="green">$ kb validate</Text>
              <Text color="gray"> - Validate all artifacts</Text>
            </Text>
            <Text>
              <Text color="green">$ kb validate A.1</Text>
              <Text color="gray"> - Validate specific artifact</Text>
            </Text>
            <Text>
              <Text color="green">$ kb validate --fix</Text>
              <Text color="gray"> - Validate and auto-fix issues</Text>
            </Text>
            <Text>
              <Text color="green">$ kb validate --json --strict</Text>
              <Text color="gray"> - JSON output with strict mode</Text>
            </Text>
          </Box>
          <Text> </Text>

          <Text color="yellow" bold>
            Validation checks:
          </Text>
          <Box marginLeft={2} flexDirection="column">
            <Text>• Required fields present</Text>
            <Text>• Valid artifact ID format</Text>
            <Text>• Parent-child relationship integrity</Text>
            <Text>• Valid state transitions</Text>
            <Text>• Schema version compatibility</Text>
          </Box>
          <Text> </Text>

          <Text color="gray">Related: kb status, kb ctx &lt;id&gt;</Text>
        </Box>
      );

    case "ctx":
    case "context":
      return (
        <Box flexDirection="column">
          <Text color="cyan" bold>
            kb ctx - Generate AI context
          </Text>
          <Text> </Text>

          <Text color="yellow" bold>
            Usage:
          </Text>
          <Box marginLeft={2} flexDirection="column">
            <Text>
              <Text color="gray">$ </Text>
              <Text>kb ctx &lt;artifact-id&gt; [options]</Text>
            </Text>
          </Box>
          <Text> </Text>

          <Text color="yellow" bold>
            Description:
          </Text>
          <Box marginLeft={2} flexDirection="column">
            <Text>
              Generates AI-optimized context from an artifact including its
            </Text>
            <Text>
              metadata, parent context, and relationships for use with AI tools.
            </Text>
          </Box>
          <Text> </Text>

          <Text color="yellow" bold>
            Options:
          </Text>
          <Box marginLeft={2} flexDirection="column">
            <Text>
              <Text color="cyan">--format &lt;type&gt; </Text>
              <Text color="gray">
                Output format: standard, compact, or detailed
              </Text>
            </Text>
            <Text>
              <Text color="cyan">--copy </Text>
              <Text color="gray">Copy context to clipboard</Text>
            </Text>
            <Text>
              <Text color="cyan">--output &lt;file&gt; </Text>
              <Text color="gray">Save context to file</Text>
            </Text>
          </Box>
          <Text> </Text>

          <Text color="yellow" bold>
            Examples:
          </Text>
          <Box marginLeft={2} flexDirection="column">
            <Text>
              <Text color="green">$ kb ctx A.1.1</Text>
              <Text color="gray"> - Generate context for A.1.1</Text>
            </Text>
            <Text>
              <Text color="green">$ kb ctx A.1.1 --copy</Text>
              <Text color="gray"> - Copy to clipboard</Text>
            </Text>
            <Text>
              <Text color="green">$ kb ctx A.1.1 --format compact</Text>
              <Text color="gray"> - Compact format</Text>
            </Text>
            <Text>
              <Text color="green">$ kb ctx A.1.1 --output context.md</Text>
              <Text color="gray"> - Save to file</Text>
            </Text>
          </Box>
          <Text> </Text>

          <Text color="yellow" bold>
            Output formats:
          </Text>
          <Box marginLeft={2} flexDirection="column">
            <Text>
              <Text color="cyan">standard </Text>
              <Text color="gray">
                - Balanced detail with hierarchy (default)
              </Text>
            </Text>
            <Text>
              <Text color="cyan">compact </Text>
              <Text color="gray">- Minimal format without parent context</Text>
            </Text>
            <Text>
              <Text color="cyan">detailed </Text>
              <Text color="gray">- Full context with all relationships</Text>
            </Text>
          </Box>
          <Text> </Text>

          <Text color="gray">
            Related: kb status &lt;id&gt;, kb start &lt;id&gt;
          </Text>
        </Box>
      );

    case "tutorial":
      return (
        <Box flexDirection="column">
          <Text color="cyan" bold>
            kb tutorial - Interactive tutorial
          </Text>
          <Text> </Text>

          <Text color="yellow" bold>
            Usage:
          </Text>
          <Box marginLeft={2} flexDirection="column">
            <Text>
              <Text color="gray">$ </Text>
              <Text>kb tutorial</Text>
            </Text>
          </Box>
          <Text> </Text>

          <Text color="yellow" bold>
            Description:
          </Text>
          <Box marginLeft={2} flexDirection="column">
            <Text>
              Launch an interactive tutorial that guides you through core
            </Text>
            <Text>
              Kodebase concepts and workflows with hands-on demonstrations.
            </Text>
          </Box>
          <Text> </Text>

          <Text color="yellow" bold>
            What you'll learn:
          </Text>
          <Box marginLeft={2} flexDirection="column">
            <Text>• Kodebase concepts (initiatives, milestones, issues)</Text>
            <Text>• Creating artifacts with proper structure</Text>
            <Text>• Understanding parent-child relationships</Text>
            <Text>• Git workflow integration</Text>
            <Text>• Essential CLI commands</Text>
          </Box>
          <Text> </Text>

          <Text color="yellow" bold>
            Tutorial features:
          </Text>
          <Box marginLeft={2} flexDirection="column">
            <Text>• 7-step interactive walkthrough</Text>
            <Text>• Creates demo artifacts you can explore</Text>
            <Text>• Progress tracking and resume capability</Text>
            <Text>• Automatic cleanup on completion</Text>
            <Text>• Takes approximately 10-15 minutes</Text>
          </Box>
          <Text> </Text>

          <Text color="gray">
            Perfect for first-time users. Run 'kb tutorial' to get started!
          </Text>
        </Box>
      );

    default:
      return (
        <Box flexDirection="column">
          <Text color="red" bold>
            Unknown command: {command}
          </Text>
          <Text> </Text>
          <Text>Available commands:</Text>
          <Box marginLeft={2} flexDirection="column">
            <Text color="gray">• start</Text>
            <Text color="gray">• status</Text>
            <Text color="gray">• validate</Text>
            <Text color="gray">• ctx (or context)</Text>
            <Text color="gray">• tutorial</Text>
            <Text color="gray">• version</Text>
            <Text color="gray">• help</Text>
          </Box>
          <Text> </Text>
          <Text color="gray">
            Run 'kb help' for general help or 'kb help &lt;command&gt;' for
            command-specific help.
          </Text>
        </Box>
      );
  }
}
