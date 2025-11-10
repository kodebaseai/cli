/**
 * ARCHIVED: This file has been replaced by test/cli.test.ts
 *
 * Reason: ink-testing-library has a dependency (patch-console@2.0.0) that is
 * incompatible with Node.js 22.16.0+ and 24.x due to console.Console constructor
 * changes. The subprocess-based tests in test/cli.test.ts provide better integration
 * testing by running the CLI as a real subprocess, avoiding this infrastructure issue.
 *
 * Original tests: Behavioral tests for App component - CLI command routing
 *
 * These tests encoded the domain invariants for command routing:
 * - Version command shows CLI and package version information
 * - Help command shows usage and available commands
 * - Unknown commands show error with help suggestion
 * - No command defaults to help
 */

import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { App } from "./App.js";

describe("App command routing", () => {
  describe("version command", () => {
    it("routes 'version' to version display", () => {
      const { lastFrame } = render(<App args={["version"]} />);

      expect(lastFrame()).toContain("Kodebase CLI v");
      expect(lastFrame()).toContain("Foundation Packages:");
    });

    it("routes '--version' flag to version display", () => {
      const { lastFrame } = render(<App args={["--version"]} />);

      expect(lastFrame()).toContain("Kodebase CLI v");
      expect(lastFrame()).toContain("Foundation Packages:");
    });

    it("routes '-v' short flag to version display", () => {
      const { lastFrame } = render(<App args={["-v"]} />);

      expect(lastFrame()).toContain("Kodebase CLI v");
      expect(lastFrame()).toContain("Foundation Packages:");
    });
  });

  describe("help command", () => {
    it("routes 'help' to help display", () => {
      const { lastFrame } = render(<App args={["help"]} />);

      expect(lastFrame()).toContain(
        "Kodebase CLI - Structured Knowledge Management",
      );
      expect(lastFrame()).toContain("Usage:");
      expect(lastFrame()).toContain("Commands:");
    });

    it("routes '--help' flag to help display", () => {
      const { lastFrame } = render(<App args={["--help"]} />);

      expect(lastFrame()).toContain(
        "Kodebase CLI - Structured Knowledge Management",
      );
      expect(lastFrame()).toContain("Usage:");
    });

    it("routes '-h' short flag to help display", () => {
      const { lastFrame } = render(<App args={["-h"]} />);

      expect(lastFrame()).toContain(
        "Kodebase CLI - Structured Knowledge Management",
      );
      expect(lastFrame()).toContain("Usage:");
    });

    it("defaults to help when no command provided", () => {
      const { lastFrame } = render(<App args={[]} />);

      expect(lastFrame()).toContain(
        "Kodebase CLI - Structured Knowledge Management",
      );
      expect(lastFrame()).toContain("Usage:");
    });
  });

  describe("unknown command handling", () => {
    it("shows error message for unknown command", () => {
      const { lastFrame } = render(<App args={["unknown"]} />);

      expect(lastFrame()).toContain("Error: Unknown command: unknown");
    });

    it("provides help suggestion after unknown command error", () => {
      const { lastFrame } = render(<App args={["unknown"]} />);

      expect(lastFrame()).toContain(
        "Run 'kb --help' to see available commands",
      );
    });

    it("shows error for unrecognized command 'init'", () => {
      const { lastFrame } = render(<App args={["init"]} />);

      expect(lastFrame()).toContain("Error: Unknown command: init");
      expect(lastFrame()).toContain(
        "Run 'kb --help' to see available commands",
      );
    });
  });

  describe("verbose flag propagation", () => {
    it("accepts verbose flag without affecting command routing", () => {
      const { lastFrame } = render(<App args={["version"]} verbose={true} />);

      expect(lastFrame()).toContain("Kodebase CLI v");
    });

    it("propagates verbose flag to error handler", () => {
      const { lastFrame } = render(<App args={["unknown"]} verbose={true} />);

      expect(lastFrame()).toContain("Error: Unknown command: unknown");
      // In verbose mode, should show more details (when ErrorHandler implements it)
    });
  });

  describe("command case sensitivity", () => {
    it("treats commands as case-sensitive (Version !== version)", () => {
      const { lastFrame } = render(<App args={["Version"]} />);

      // Should be treated as unknown command, not version
      expect(lastFrame()).toContain("Error: Unknown command: Version");
    });

    it("treats help as case-sensitive", () => {
      const { lastFrame } = render(<App args={["HELP"]} />);

      expect(lastFrame()).toContain("Error: Unknown command: HELP");
    });
  });
});
