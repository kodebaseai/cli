/**
 * CLI Integration Tests - Subprocess-based behavioral tests
 *
 * These tests run the CLI as a subprocess to test end-to-end behavior
 * without relying on ink-testing-library (which has Node.js compatibility issues).
 *
 * Domain invariants:
 * - Version command shows CLI and package version information
 * - Help command shows usage and available commands
 * - Unknown commands show error with help suggestion
 * - No command defaults to help
 * - Platform and runtime information is displayed correctly
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

describe("CLI command routing", () => {
  it("routes version commands (version, --version, -v)", async () => {
    // Test all version command variants in one test
    for (const arg of ["version", "--version", "-v"]) {
      const { stdout } = await runCLI([arg]);
      expect(stdout).toContain("Kodebase CLI v");
      expect(stdout).toContain("Foundation Packages:");
    }
  });

  it("routes help commands (help, --help, -h, no args)", async () => {
    // Test all help command variants in one test
    for (const args of [["help"], ["--help"], ["-h"], []]) {
      const { stdout } = await runCLI(args);
      expect(stdout).toContain(
        "Kodebase CLI - Structured Knowledge Management",
      );
      expect(stdout).toContain("Usage:");
    }
  });

  it("shows error and help suggestion for unknown commands", async () => {
    const { output } = await runCLI(["unknown"]);
    expect(output).toContain("Error: Unknown command: unknown");
    expect(output).toContain("Run 'kb --help' to see available commands");
  });

  it("handles verbose flag without affecting routing", async () => {
    const { stdout } = await runCLI(["version", "--verbose"]);
    expect(stdout).toContain("Kodebase CLI v");
  });

  it("treats commands as case-sensitive", async () => {
    const { output: versionOutput } = await runCLI(["Version"]);
    expect(versionOutput).toContain("Error: Unknown command: Version");

    const { output: helpOutput } = await runCLI(["HELP"]);
    expect(helpOutput).toContain("Error: Unknown command: HELP");
  });
});

describe("Version information display", () => {
  it("displays CLI version with semantic versioning", async () => {
    const { stdout } = await runCLI(["--version"]);

    expect(stdout).toMatch(/Kodebase CLI v\d+\.\d+\.\d+/);
    expect(stdout).toMatch(/v\d+\.\d+\.\d+(-[a-z]+\.\d+)?/);
  });

  it("displays all foundation packages with versions", async () => {
    const { stdout } = await runCLI(["--version"]);

    expect(stdout).toContain("Foundation Packages:");

    const packages = ["core", "artifacts", "git-ops", "config"];
    for (const pkg of packages) {
      expect(stdout).toContain(`@kodebase/${pkg}`);
      expect(stdout).toMatch(
        new RegExp(`@kodebase\\/${pkg}\\s+v\\d+\\.\\d+\\.\\d+`),
      );
    }

    // Verify packages appear after heading
    const headingIndex = stdout.indexOf("Foundation Packages:");
    const coreIndex = stdout.indexOf("@kodebase/core");
    expect(coreIndex).toBeGreaterThan(headingIndex);
  });

  it("displays runtime environment (Node.js and platform)", async () => {
    const { stdout } = await runCLI(["--version"]);

    // Node.js version
    expect(stdout).toContain("Node.js:");
    expect(stdout).toMatch(/Node\.js: v\d+\.\d+\.\d+/);

    // Platform with human-readable name
    expect(stdout).toContain("Platform:");
    expect(stdout).toMatch(/Platform: \w+ \([^)]+\)/);

    if (process.platform === "darwin") {
      expect(stdout).toContain("(macOS)");
    }
  });

  it("maintains consistent format with proper structure", async () => {
    const { stdout } = await runCLI(["--version"]);

    // Check section separation
    expect(stdout).toContain("Kodebase CLI");
    expect(stdout).toContain("Foundation Packages:");
    expect(stdout).toContain("Node.js:");

    // All versions should have consistent format
    const versionMatches = stdout.match(/v\d+\.\d+\.\d+/g);
    expect(versionMatches).toBeDefined();
    expect(versionMatches?.length ?? 0).toBeGreaterThanOrEqual(5); // CLI + 4 packages
  });
});
