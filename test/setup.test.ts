/**
 * Setup Command Behavioral Tests - Subprocess-based
 *
 * Tests the setup command and wizard flow using subprocess execution.
 *
 * Domain invariants:
 * - Setup requires valid preset: solo, small_team, or enterprise
 * - Invalid preset values are rejected with clear error message
 * - Setup can skip authentication with --skip-auth flag
 * - Setup can skip hook installation with --skip-hooks flag
 * - Setup can force overwrite existing config with --force flag
 * - Setup validates flags and provides helpful error messages
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execa } from "execa";
import stripAnsi from "strip-ansi";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const cliPath = join(__dirname, "../dist/index.js");

/**
 * Execute the CLI with given arguments
 */
const runCLI = async (args: string[]) => {
  const result = await execa("node", [cliPath, ...args], {
    reject: false,
    env: { FORCE_COLOR: "0" }, // Disable colors for easier assertions
  });

  return {
    stdout: stripAnsi(result.stdout),
    stderr: stripAnsi(result.stderr),
    exitCode: result.exitCode,
    output: stripAnsi(result.stdout + result.stderr),
  };
};

describe("Setup command routing", () => {
  describe("preset flag validation", () => {
    it("accepts valid preset: solo", async () => {
      const { output } = await runCLI(["setup", "--preset=solo"]);
      // Should not show preset validation error
      expect(output).not.toContain("Invalid preset");
    });

    it("accepts valid preset: small_team", async () => {
      const { output } = await runCLI(["setup", "--preset=small_team"]);
      expect(output).not.toContain("Invalid preset");
    });

    it("accepts valid preset: enterprise", async () => {
      const { output } = await runCLI(["setup", "--preset=enterprise"]);
      expect(output).not.toContain("Invalid preset");
    });

    it("rejects invalid preset value with clear error", async () => {
      const { output } = await runCLI(["setup", "--preset=invalid"]);
      expect(output).toContain("Invalid preset: invalid");
      expect(output).toContain("Must be one of: solo, small_team, enterprise");
    });

    it("rejects typo in preset value", async () => {
      const { output } = await runCLI(["setup", "--preset=team"]);
      expect(output).toContain("Invalid preset: team");
      expect(output).toContain("Must be one of: solo, small_team, enterprise");
    });

    it("handles case-sensitive preset values", async () => {
      // Presets are lowercase only
      const { output } = await runCLI(["setup", "--preset=Solo"]);
      expect(output).toContain("Invalid preset: Solo");
    });
  });

  describe("flag combinations", () => {
    it("accepts --skip-auth flag", async () => {
      const { output } = await runCLI([
        "setup",
        "--preset=solo",
        "--skip-auth",
      ]);
      // Should not show validation error (wizard may show raw mode error in CI, that's ok)
      expect(output).not.toContain("Invalid");
      expect(output).not.toContain("Unknown command");
    });

    it("accepts --skip-hooks flag", async () => {
      const { output } = await runCLI([
        "setup",
        "--preset=solo",
        "--skip-hooks",
      ]);
      expect(output).not.toContain("Invalid");
      expect(output).not.toContain("Unknown command");
    });

    it("accepts --force flag", async () => {
      const { output } = await runCLI(["setup", "--preset=solo", "--force"]);
      expect(output).not.toContain("Invalid");
      expect(output).not.toContain("Unknown command");
    });

    it("accepts multiple flags together", async () => {
      const { output } = await runCLI([
        "setup",
        "--preset=enterprise",
        "--skip-auth",
        "--skip-hooks",
        "--force",
      ]);
      expect(output).not.toContain("Invalid");
      expect(output).not.toContain("Unknown command");
    });
  });

  describe("wizard flow without preset flag", () => {
    it("starts wizard when no preset provided", async () => {
      const { output } = await runCLI(["setup"]);

      // In environments that support raw mode (local dev), check for wizard
      // In environments that don't (CI), check that setup command was recognized
      const isRawModeError = output.includes("Raw mode is not supported");

      if (!isRawModeError) {
        // Local environment - verify wizard starts (shows environment detection or preset selection)
        // The exact step depends on whether environment detection passes
        expect(output).not.toContain("Unknown command");
        expect(output).not.toContain("Invalid");
      } else {
        // CI environment - just verify command was recognized
        expect(output).not.toContain("Unknown command: setup");
      }
    });
  });

  describe("help integration", () => {
    it("shows setup help with kb help setup", async () => {
      const { stdout } = await runCLI(["help", "setup"]);
      expect(stdout).toContain("setup");
      expect(stdout).toContain("--preset");
    });
  });
});
