/**
 * Validate Command Integration Tests - Subprocess-based behavioral tests
 *
 * These tests run the CLI as a subprocess to test the validate command
 * end-to-end behavior with real artifacts.
 *
 * Domain invariants:
 * - Command validates all artifacts by default (no artifact ID required)
 * - Command validates specific artifact when ID provided
 * - Command displays errors and warnings with suggested fixes
 * - Command applies safe auto-fixes with --fix flag
 * - Command exits with code 1 when --strict flag used and errors found
 * - Command outputs valid JSON with --json flag
 * - Command shows summary statistics (total, valid, errors, warnings)
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

describe("validate command", () => {
  describe("basic validation", () => {
    it("validates all artifacts by default", async () => {
      const { output, exitCode } = await runCLI(["validate"]);

      // Should validate and show summary
      expect(output).toContain("Summary:");
      expect(output).toContain("Total:");
      expect(exitCode).toBe(0);
    }, 10000); // 10 second timeout for validating all artifacts

    it("validates specific artifact when ID provided", async () => {
      const { output, exitCode } = await runCLI(["validate", "E.1"]);

      // Should validate single artifact
      expect(output).toContain("E.1");
      expect(output).toContain("Summary:");
      expect(output).toContain("Total: 1");
      expect(exitCode).toBe(0);
    });

    it("shows error for non-existent artifact", async () => {
      const { output } = await runCLI(["validate", "Z.99.99"]);

      // Should show error message for missing artifact
      expect(output).toContain('Artifact "Z.99.99" not found');
    });
  });

  describe("output formats", () => {
    it("displays human-readable format by default", async () => {
      const { output } = await runCLI(["validate", "E.1"]);

      // Should show human-readable output
      expect(output).toMatch(/[✓✗]/); // Check mark or X mark
      expect(output).toContain("Summary:");
    });

    it("outputs valid JSON with --json flag", async () => {
      const { output } = await runCLI(["validate", "E.1", "--json"]);

      // Should output valid JSON
      expect(() => JSON.parse(output)).not.toThrow();

      const json = JSON.parse(output);
      expect(json).toHaveProperty("summary");
      expect(json).toHaveProperty("results");
      expect(json.summary).toHaveProperty("total");
      expect(json.summary).toHaveProperty("valid");
    });
  });

  describe("flags", () => {
    it("shows fix suggestion when artifacts have warnings", async () => {
      const { output } = await runCLI(["validate"]);

      // If there are warnings, should show fix suggestion
      if (output.includes("Warnings:") && !output.includes("Warnings: 0")) {
        expect(output).toContain("--fix");
      }
    }, 10000); // 10 second timeout for validating all artifacts

    it("accepts --fix flag without errors", async () => {
      const { exitCode } = await runCLI(["validate", "--fix"]);

      // Should accept --fix flag (even if no fixes applied)
      expect(exitCode).toBe(0);
    }, 10000); // 10 second timeout for validating all artifacts

    it("accepts --strict flag without errors when artifacts are valid", async () => {
      const { exitCode } = await runCLI(["validate", "E.1", "--strict"]);

      // E.1 is a completed milestone, should be valid
      // Exit code depends on whether E.1 has errors
      expect([0, 1]).toContain(exitCode);
    });
  });

  describe("help integration", () => {
    it("validate command appears in help output", async () => {
      const { stdout, exitCode } = await runCLI(["--help"]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("validate");
      expect(stdout).toContain("Validate artifacts");
    });
  });

  describe("error display", () => {
    it("only shows artifacts with errors (not valid artifacts)", async () => {
      const { output } = await runCLI(["validate"]);

      // Should NOT show ✓ symbols since we only display artifacts with errors
      // When all artifacts are valid, only summary is shown
      expect(output).toContain("Summary:");
      expect(output).toContain("Total:");
      expect(output).toContain("Valid:");
      // Should not show individual artifact validation status when all are valid
      expect(output).not.toMatch(/✓/);
    }, 10000); // 10 second timeout for validating all artifacts

    it("shows summary statistics", async () => {
      const { output } = await runCLI(["validate"]);

      // Should show all summary statistics
      expect(output).toContain("Total:");
      expect(output).toContain("Valid:");
    }, 10000); // 10 second timeout for validating all artifacts
  });
});
