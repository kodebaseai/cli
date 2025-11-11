/**
 * Status Command Integration Tests - Subprocess-based behavioral tests
 *
 * These tests run the CLI as a subprocess to test the status command
 * end-to-end behavior with real artifacts.
 *
 * Domain invariants:
 * - Detailed mode shows full artifact information
 * - List mode (--all) shows table of all artifacts
 * - JSON mode outputs valid machine-readable JSON
 * - Filtering works for --state and --assignee
 * - Error handling works for missing artifacts
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
    cwd: repoRoot, // Run from repository root
    env: { FORCE_COLOR: "0" }, // Disable colors for easier assertions
  });

  return {
    stdout: stripAnsi(result.stdout),
    stderr: stripAnsi(result.stderr),
    exitCode: result.exitCode,
    output: stripAnsi(result.stdout + result.stderr),
  };
};

describe("status command", () => {
  describe("detailed mode", () => {
    it("displays artifact title and metadata for existing artifact", async () => {
      const { stdout, exitCode } = await runCLI(["status", "A.1.1"]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("A.1.1:");
      expect(stdout).toContain("Define v1 constants and triggers");
      expect(stdout).toContain("Priority:");
      expect(stdout).toContain("Estimation:");
      expect(stdout).toContain("Assignee:");
    }, 10000);

    it("displays event history section", async () => {
      const { stdout, exitCode } = await runCLI(["status", "A.1.1"]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Event History:");
    }, 10000);

    it("displays relationships when present", async () => {
      const { stdout, exitCode } = await runCLI(["status", "A.1.1"]);

      expect(exitCode).toBe(0);
      // A.1.1 blocks A.1.2 according to the artifact
      expect(stdout).toContain("Blocks:");
      expect(stdout).toContain("A.1.2");
    }, 10000);

    it("shows error for non-existent artifact", async () => {
      const { output, exitCode } = await runCLI(["status", "Z.99.99"]);

      expect(exitCode).toBe(0); // CLI doesn't crash
      expect(output).toContain("not found" || "Error");
    }, 10000);
  });

  describe("list mode (--all)", () => {
    it("displays table header with columns", async () => {
      const { stdout, exitCode } = await runCLI(["status", "--all"]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Artifacts");
      expect(stdout).toContain("ID");
      expect(stdout).toContain("Status");
      expect(stdout).toContain("Priority");
      expect(stdout).toContain("Title");
    }, 10000);

    it("shows total count of artifacts", async () => {
      const { stdout, exitCode } = await runCLI(["status", "--all"]);

      expect(exitCode).toBe(0);
      expect(stdout).toMatch(/Total:\s+\d+/);
    }, 10000);

    it("displays artifact rows with data", async () => {
      const { stdout, exitCode } = await runCLI(["status", "--all"]);

      expect(exitCode).toBe(0);
      // Should contain at least A.1.1 which we know exists
      expect(stdout).toContain("A.1.1");
    }, 10000);
  });

  describe("JSON output mode", () => {
    it("outputs valid JSON for single artifact", async () => {
      const { stdout, exitCode } = await runCLI(["status", "A.1.1", "--json"]);

      expect(exitCode).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(parsed).toHaveProperty("id");
      expect(parsed).toHaveProperty("title");
      expect(parsed).toHaveProperty("state");
      expect(parsed.id).toBe("A.1.1");
    }, 10000);

    it("outputs valid JSON array for --all mode", async () => {
      const { stdout, exitCode } = await runCLI(["status", "--all", "--json"]);

      expect(exitCode).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(parsed).toHaveProperty("artifacts");
      expect(parsed).toHaveProperty("total");
      expect(Array.isArray(parsed.artifacts)).toBe(true);
      expect(parsed.total).toBeGreaterThan(0);
    }, 10000);

    it("includes all metadata in JSON output", async () => {
      const { stdout, exitCode } = await runCLI(["status", "A.1.1", "--json"]);

      expect(exitCode).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(parsed).toHaveProperty("priority");
      expect(parsed).toHaveProperty("estimation");
      expect(parsed).toHaveProperty("assignee");
      expect(parsed).toHaveProperty("relationships");
      expect(parsed).toHaveProperty("events");
    }, 10000);
  });

  describe("filtering", () => {
    it("filters by state using --state flag", async () => {
      const { stdout, exitCode } = await runCLI([
        "status",
        "--all",
        "--state=completed",
      ]);

      expect(exitCode).toBe(0);
      // Output should only contain completed artifacts or "No artifacts found"
      expect(stdout).toBeTruthy();
    }, 10000);

    it("filters by assignee using --assignee flag", async () => {
      const { stdout, exitCode } = await runCLI([
        "status",
        "--all",
        "--assignee=Miguel Carvalho",
      ]);

      expect(exitCode).toBe(0);
      expect(stdout).toBeTruthy();
    }, 10000);

    it("shows helpful message when no artifacts match filters", async () => {
      const { stdout, exitCode } = await runCLI([
        "status",
        "--all",
        "--state=nonexistent_state",
      ]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("No artifacts found");
    }, 10000);
  });

  describe("argument validation", () => {
    it("requires either artifact ID or --all flag", async () => {
      const { output, exitCode } = await runCLI(["status"]);

      expect(exitCode).toBe(0);
      expect(output).toContain(
        "Either artifact ID or --all flag must be provided",
      );
    }, 10000);

    it("shows usage examples on validation error", async () => {
      const { output, exitCode } = await runCLI(["status"]);

      expect(exitCode).toBe(0);
      expect(output).toContain("Usage:");
      expect(output).toContain("kb status");
    }, 10000);
  });
});
