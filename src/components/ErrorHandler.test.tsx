/**
 * Behavioral tests for ErrorHandler component
 *
 * Invariants:
 * - All errors display with red "✗ Error:" prefix
 * - CLIError instances show structured suggestions
 * - Verbose mode shows stack traces
 * - Non-verbose mode hints at --verbose flag
 * - Cause chain is displayed for wrapped errors
 * - Suggestions include action, optional command, and description
 */

import { Text } from "ink";
import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { CLIError } from "../types/errors.js";
import { ErrorHandler, withErrorHandler } from "./ErrorHandler.js";

// Concrete CLIError subclass for testing
class TestError extends CLIError {}

describe("ErrorHandler error display", () => {
  describe("basic error rendering", () => {
    it("displays error message with red 'Error:' prefix", () => {
      const error = new Error("Something went wrong");
      const { lastFrame } = render(<ErrorHandler error={error} />);

      expect(lastFrame()).toContain("✗ Error:");
      expect(lastFrame()).toContain("Something went wrong");
    });

    it("shows standard Error instances", () => {
      const error = new Error("File not found");
      const { lastFrame } = render(<ErrorHandler error={error} />);

      expect(lastFrame()).toContain("File not found");
    });

    it("handles errors with special characters in message", () => {
      const error = new Error("Invalid JSON: { 'foo': bar }");
      const { lastFrame } = render(<ErrorHandler error={error} />);

      expect(lastFrame()).toContain("Invalid JSON");
    });
  });

  describe("CLIError with suggestions", () => {
    it("displays suggestions section when CLIError has suggestions", () => {
      const error = new TestError("Configuration not found", {
        suggestions: [
          {
            action: "Initialize configuration",
            command: "kb init",
            description: "Create a default configuration file",
          },
        ],
      });

      const { lastFrame } = render(<ErrorHandler error={error} />);

      expect(lastFrame()).toContain("Suggestions:");
      expect(lastFrame()).toContain("Initialize configuration");
    });

    it("displays suggestion action as bullet point", () => {
      const error = new TestError("Invalid command", {
        suggestions: [
          {
            action: "Check command spelling",
            description: "Verify the command name",
          },
        ],
      });

      const { lastFrame } = render(<ErrorHandler error={error} />);

      expect(lastFrame()).toContain("• Check command spelling");
    });

    it("displays suggested command with shell prompt", () => {
      const error = new TestError("Missing dependency", {
        suggestions: [
          {
            action: "Install dependencies",
            command: "pnpm install",
            description: "Install all required packages",
          },
        ],
      });

      const { lastFrame } = render(<ErrorHandler error={error} />);

      expect(lastFrame()).toContain("$ pnpm install");
    });

    it("displays suggestion description", () => {
      const error = new TestError("Build failed", {
        suggestions: [
          {
            action: "Clean build artifacts",
            command: "pnpm clean",
            description: "Remove old build files and try again",
          },
        ],
      });

      const { lastFrame } = render(<ErrorHandler error={error} />);

      expect(lastFrame()).toContain("Remove old build files and try again");
    });

    it("handles suggestions without commands", () => {
      const error = new TestError("Operation failed", {
        suggestions: [
          {
            action: "Retry the operation",
            description: "The issue may be temporary",
          },
        ],
      });

      const { lastFrame } = render(<ErrorHandler error={error} />);

      expect(lastFrame()).toContain("• Retry the operation");
      expect(lastFrame()).toContain("The issue may be temporary");
      expect(lastFrame()).not.toContain("$");
    });

    it("displays multiple suggestions in order", () => {
      const error = new TestError("Multiple issues found", {
        suggestions: [
          {
            action: "First action",
            description: "Try this first",
          },
          {
            action: "Second action",
            description: "If first fails, try this",
          },
          {
            action: "Third action",
            description: "Last resort option",
          },
        ],
      });

      const { lastFrame } = render(<ErrorHandler error={error} />);
      const output = lastFrame();

      expect(output).toBeDefined();
      const firstIndex = output?.indexOf("First action") ?? -1;
      const secondIndex = output?.indexOf("Second action") ?? -1;
      const thirdIndex = output?.indexOf("Third action") ?? -1;

      expect(firstIndex).toBeLessThan(secondIndex);
      expect(secondIndex).toBeLessThan(thirdIndex);
    });
  });

  describe("verbose mode behavior", () => {
    it("shows stack trace when verbose is true", () => {
      const error = new Error("Test error");
      const { lastFrame } = render(
        <ErrorHandler error={error} verbose={true} />,
      );

      expect(lastFrame()).toContain("Stack trace:");
    });

    it("hides stack trace when verbose is false", () => {
      const error = new Error("Test error");
      const { lastFrame } = render(
        <ErrorHandler error={error} verbose={false} />,
      );

      expect(lastFrame()).not.toContain("Stack trace:");
    });

    it("shows verbose hint when not in verbose mode", () => {
      const error = new Error("Test error");
      const { lastFrame } = render(
        <ErrorHandler error={error} verbose={false} />,
      );

      expect(lastFrame()).toContain("Use --verbose flag");
      expect(lastFrame()).toContain("detailed error information");
    });

    it("hides verbose hint when in verbose mode", () => {
      const error = new Error("Test error");
      const { lastFrame } = render(
        <ErrorHandler error={error} verbose={true} />,
      );

      expect(lastFrame()).not.toContain("Use --verbose flag");
    });

    it("respects CLIError showStackTrace flag even when not verbose", () => {
      const error = new TestError("Critical error", {
        showStackTrace: true,
      });

      const { lastFrame } = render(
        <ErrorHandler error={error} verbose={false} />,
      );

      expect(lastFrame()).toContain("Stack trace:");
    });
  });

  describe("error cause chain", () => {
    it("displays cause when CLIError wraps another error", () => {
      const rootCause = new Error("Connection timeout");
      const error = new TestError("Failed to fetch data", {
        cause: rootCause,
      });

      const { lastFrame } = render(<ErrorHandler error={error} />);

      expect(lastFrame()).toContain("Caused by: Connection timeout");
    });

    it("does not show cause for standard errors", () => {
      const error = new Error("Standard error");
      const { lastFrame } = render(<ErrorHandler error={error} />);

      expect(lastFrame()).not.toContain("Caused by:");
    });

    it("displays primary message before cause", () => {
      const rootCause = new Error("Invalid format");
      const error = new TestError("Parsing failed", {
        cause: rootCause,
      });

      const { lastFrame } = render(<ErrorHandler error={error} />);
      const output = lastFrame();

      expect(output).toBeDefined();
      const primaryIndex = output?.indexOf("Parsing failed") ?? -1;
      const causeIndex = output?.indexOf("Caused by: Invalid format") ?? -1;

      expect(primaryIndex).toBeLessThan(causeIndex);
    });
  });

  describe("error formatting structure", () => {
    it("displays sections in logical order: error, cause, suggestions, stack, hint", () => {
      const rootCause = new Error("Root cause");
      const error = new TestError("Top level error", {
        cause: rootCause,
        suggestions: [
          {
            action: "Fix the issue",
            description: "How to fix",
          },
        ],
      });

      const { lastFrame } = render(
        <ErrorHandler error={error} verbose={true} />,
      );
      const output = lastFrame();

      expect(output).toBeDefined();
      const errorIndex = output?.indexOf("✗ Error:") ?? -1;
      const causeIndex = output?.indexOf("Caused by:") ?? -1;
      const suggestionIndex = output?.indexOf("Suggestions:") ?? -1;
      const stackIndex = output?.indexOf("Stack trace:") ?? -1;

      expect(errorIndex).toBeGreaterThan(-1);
      expect(causeIndex).toBeGreaterThan(errorIndex);
      expect(suggestionIndex).toBeGreaterThan(causeIndex);
      expect(stackIndex).toBeGreaterThan(suggestionIndex);
    });

    it("indents suggestions under heading", () => {
      const error = new TestError("Error with suggestions", {
        suggestions: [
          {
            action: "Take action",
            description: "Action description",
          },
        ],
      });

      const { lastFrame } = render(<ErrorHandler error={error} />);
      const output = lastFrame();

      expect(output).toBeDefined();
      const headingIndex = output?.indexOf("Suggestions:") ?? -1;
      const actionIndex = output?.indexOf("• Take action") ?? -1;

      expect(actionIndex).toBeGreaterThan(headingIndex);
    });
  });
});

describe("useErrorHandler hook", () => {
  // Note: Hook tests require rendering within a component context
  // These tests verify the hook behavior through the withErrorHandler HOC

  it("wraps component and handles errors", () => {
    const ThrowingComponent = () => {
      throw new Error("Component error");
    };
    const WrappedComponent = withErrorHandler(ThrowingComponent);

    const { lastFrame } = render(<WrappedComponent />);

    expect(lastFrame()).toContain("✗ Error:");
    expect(lastFrame()).toContain("Component error");
  });

  it("passes props through to wrapped component", () => {
    const TestComponent = ({ message }: { message: string }) => (
      <Text>{message}</Text>
    );
    const WrappedComponent = withErrorHandler(TestComponent);

    const { lastFrame } = render(<WrappedComponent message="Hello" />);

    expect(lastFrame()).toContain("Hello");
  });

  it("propagates verbose flag to error handler", () => {
    const ThrowingComponent = () => {
      throw new Error("Verbose error");
    };
    const WrappedComponent = withErrorHandler(ThrowingComponent);

    const { lastFrame } = render(<WrappedComponent verbose={true} />);

    expect(lastFrame()).toContain("Stack trace:");
  });
});
