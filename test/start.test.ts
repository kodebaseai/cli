/**
 * Start Command Integration Tests - Subprocess-based behavioral tests
 *
 * These tests run the CLI as a subprocess to test the start command
 * end-to-end behavior with real artifacts.
 *
 * Domain invariants:
 * - Command validates artifact readiness before starting
 * - Command creates branch with artifact ID as name
 * - Command generates context and copies to clipboard
 * - Command handles blocked artifacts with clear error messages
 * - --submit flag validates and creates PR
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execa } from "execa";
import stripAnsi from "strip-ansi";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const cliPath = join(__dirname, "../dist/index.js");
// Run from repository root where .kodebase/ directory exists
const repoRoot = join(__dirname, "../../..");

/**
 * Execute the CLI with given arguments
 */
const runCLI = async (args: string[]) => {
  const result = await execa("node", [cliPath, ...args], {
    reject: false,
    cwd: repoRoot,
    env: { FORCE_COLOR: "0" }, // Disable colors for easier assertions
  });

  return {
    stdout: stripAnsi(result.stdout),
    stderr: stripAnsi(result.stderr),
    exitCode: result.exitCode,
    output: stripAnsi(result.stdout + result.stderr),
  };
};

describe("start command", () => {
  describe("validation", () => {
    it("requires artifact ID argument", async () => {
      const { output } = await runCLI(["start"]);

      // CLI should display error message (exit code may be 0 due to graceful error handling)
      expect(output).toContain("Artifact ID is required");
      expect(output).toContain("Usage: kb start <artifact-id>");
    });

    it("shows error for non-existent artifact", async () => {
      const { output } = await runCLI(["start", "Z.99.99"]);

      // Should show error message for missing artifact
      expect(output).toContain('Artifact "Z.99.99" not found');
    });
  });

  describe("error messages", () => {
    it("displays clear message when artifact directory not found", async () => {
      // Run from a non-kodebase directory (test directory itself)
      const result = await execa("node", [cliPath, "start", "A.1.1"], {
        reject: false,
        cwd: __dirname, // Not a kodebase project
        env: { FORCE_COLOR: "0" },
      });

      const output = stripAnsi(result.stdout + result.stderr);
      // Should show error about missing .kodebase/artifacts directory
      expect(output).toContain("ENOENT");
      expect(output).toContain(".kodebase/artifacts");
    });

    it("shows usage hint on validation error", async () => {
      const { output } = await runCLI(["start"]);

      expect(output).toContain("Usage: kb start <artifact-id>");
      expect(output).toContain("[--submit]");
    });
  });

  describe("help integration", () => {
    it("start command appears in help output", async () => {
      const { stdout, exitCode } = await runCLI(["--help"]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("start <artifact-id>");
      expect(stdout).toContain("Start work on an artifact");
    });
  });
});
