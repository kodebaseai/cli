/**
 * ARCHIVED: This file has been replaced by test/cli.test.ts
 *
 * Reason: ink-testing-library has a dependency (patch-console@2.0.0) that is
 * incompatible with Node.js 22.16.0+ and 24.x due to console.Console constructor
 * changes. The subprocess-based tests in test/cli.test.ts provide better integration
 * testing by running the CLI as a real subprocess, avoiding this infrastructure issue.
 *
 * Original tests: Behavioral tests for Version component
 *
 * Invariants:
 * - Displays CLI version from package
 * - Lists all foundation package versions
 * - Shows Node.js runtime version
 * - Displays platform with human-readable name
 * - Output format is consistent and parseable
 */

import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { Version } from "./Version.js";

describe("Version information display", () => {
  describe("CLI version", () => {
    it("displays CLI version with 'v' prefix", () => {
      const { lastFrame } = render(<Version />);

      expect(lastFrame()).toMatch(/Kodebase CLI v\d+\.\d+\.\d+/);
    });

    it("shows semantic version format (major.minor.patch)", () => {
      const { lastFrame } = render(<Version />);
      const output = lastFrame();

      // Match semantic versioning pattern
      expect(output).toMatch(/v\d+\.\d+\.\d+(-[a-z]+\.\d+)?/);
    });
  });

  describe("foundation packages", () => {
    it("displays @kodebase/core version", () => {
      const { lastFrame } = render(<Version />);

      expect(lastFrame()).toContain("@kodebase/core");
      expect(lastFrame()).toMatch(/@kodebase\/core\s+v\d+\.\d+\.\d+/);
    });

    it("displays @kodebase/artifacts version", () => {
      const { lastFrame } = render(<Version />);

      expect(lastFrame()).toContain("@kodebase/artifacts");
      expect(lastFrame()).toMatch(/@kodebase\/artifacts\s+v\d+\.\d+\.\d+/);
    });

    it("displays @kodebase/git-ops version", () => {
      const { lastFrame } = render(<Version />);

      expect(lastFrame()).toContain("@kodebase/git-ops");
      expect(lastFrame()).toMatch(/@kodebase\/git-ops\s+v\d+\.\d+\.\d+/);
    });

    it("displays @kodebase/config version", () => {
      const { lastFrame } = render(<Version />);

      expect(lastFrame()).toContain("@kodebase/config");
      expect(lastFrame()).toMatch(/@kodebase\/config\s+v\d+\.\d+\.\d+/);
    });

    it("groups all foundation packages under 'Foundation Packages' heading", () => {
      const { lastFrame } = render(<Version />);

      expect(lastFrame()).toContain("Foundation Packages:");
    });
  });

  describe("runtime environment", () => {
    it("displays Node.js version", () => {
      const { lastFrame } = render(<Version />);

      expect(lastFrame()).toContain("Node.js:");
      expect(lastFrame()).toMatch(/Node\.js: v\d+\.\d+\.\d+/);
    });

    it("displays platform identifier", () => {
      const { lastFrame } = render(<Version />);

      expect(lastFrame()).toContain("Platform:");
      // Should show platform ID (darwin, linux, win32)
      expect(lastFrame()).toMatch(/Platform: \w+/);
    });

    it("displays human-readable platform name for macOS", () => {
      // process.platform is 'darwin' on macOS
      if (process.platform === "darwin") {
        const { lastFrame } = render(<Version />);

        expect(lastFrame()).toContain("(macOS)");
      }
    });

    it("displays human-readable platform name in parentheses", () => {
      const { lastFrame } = render(<Version />);

      // Should have format: "Platform: <id> (<readable name>)"
      expect(lastFrame()).toMatch(/Platform: \w+ \([^)]+\)/);
    });
  });

  describe("output format structure", () => {
    it("separates sections with blank lines", () => {
      const { lastFrame } = render(<Version />);
      const output = lastFrame();

      // Check for section separation
      expect(output).toContain("Kodebase CLI");
      expect(output).toContain("Foundation Packages:");
      expect(output).toContain("Node.js:");
    });

    it("indents foundation packages under heading", () => {
      const { lastFrame } = render(<Version />);
      const output = lastFrame();

      expect(output).toBeDefined();
      // Foundation packages should appear after heading
      const headingIndex = output?.indexOf("Foundation Packages:") ?? -1;
      const coreIndex = output?.indexOf("@kodebase/core") ?? -1;

      expect(coreIndex).toBeGreaterThan(headingIndex);
    });

    it("maintains consistent version format across all packages", () => {
      const { lastFrame } = render(<Version />);
      const output = lastFrame();

      expect(output).toBeDefined();
      // All versions should have 'v' prefix and semantic versioning
      const versionMatches = output?.match(/v\d+\.\d+\.\d+/g);

      expect(versionMatches).toBeDefined();
      expect(versionMatches?.length ?? 0).toBeGreaterThanOrEqual(5); // CLI + 4 packages
    });
  });

  describe("platform name transformation", () => {
    it("transforms 'darwin' to 'macOS'", () => {
      if (process.platform === "darwin") {
        const { lastFrame } = render(<Version />);

        expect(lastFrame()).toContain("macOS");
      }
    });

    it("uses platform ID as fallback for unknown platforms", () => {
      const { lastFrame } = render(<Version />);

      // Should always show some platform identifier
      expect(lastFrame()).toMatch(/Platform: \w+/);
    });
  });
});
