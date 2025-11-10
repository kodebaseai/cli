/**
 * Behavioral tests for Help component
 *
 * Invariants:
 * - Shows CLI title and tagline
 * - Displays usage syntax
 * - Lists all available commands with descriptions
 * - Shows available options/flags
 * - Provides link to documentation
 */

import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { Help } from "./Help.js";

describe("Help display", () => {
  describe("header and branding", () => {
    it("displays CLI name and tagline", () => {
      const { lastFrame } = render(<Help />);

      expect(lastFrame()).toContain("Kodebase CLI");
      expect(lastFrame()).toContain("Structured Knowledge Management");
    });

    it("shows branding as first line", () => {
      const { lastFrame } = render(<Help />);
      const output = lastFrame();

      expect(output.indexOf("Kodebase CLI")).toBeLessThan(20);
    });
  });

  describe("usage syntax", () => {
    it("displays 'Usage:' section heading", () => {
      const { lastFrame } = render(<Help />);

      expect(lastFrame()).toContain("Usage:");
    });

    it("shows command syntax pattern 'kb [command] [options]'", () => {
      const { lastFrame } = render(<Help />);

      expect(lastFrame()).toContain("kb [command] [options]");
    });

    it("includes shell prompt for clarity", () => {
      const { lastFrame } = render(<Help />);

      expect(lastFrame()).toContain("$");
    });
  });

  describe("available commands", () => {
    it("displays 'Commands:' section heading", () => {
      const { lastFrame } = render(<Help />);

      expect(lastFrame()).toContain("Commands:");
    });

    it("lists version command with all variants", () => {
      const { lastFrame } = render(<Help />);
      const output = lastFrame();

      expect(output).toContain("version");
      expect(output).toContain("--version");
      expect(output).toContain("-v");
    });

    it("describes version command purpose", () => {
      const { lastFrame } = render(<Help />);

      expect(lastFrame()).toContain("Display version information");
    });

    it("lists help command with all variants", () => {
      const { lastFrame } = render(<Help />);
      const output = lastFrame();

      expect(output).toContain("help");
      expect(output).toContain("--help");
      expect(output).toContain("-h");
    });

    it("describes help command purpose", () => {
      const { lastFrame } = render(<Help />);

      expect(lastFrame()).toContain("Show this help message");
    });
  });

  describe("options and flags", () => {
    it("displays 'Options:' section heading", () => {
      const { lastFrame } = render(<Help />);

      expect(lastFrame()).toContain("Options:");
    });

    it("lists --verbose flag", () => {
      const { lastFrame } = render(<Help />);

      expect(lastFrame()).toContain("--verbose");
    });

    it("describes verbose flag purpose", () => {
      const { lastFrame } = render(<Help />);

      expect(lastFrame()).toContain("Enable verbose output");
      expect(lastFrame()).toContain("detailed error messages");
    });
  });

  describe("documentation reference", () => {
    it("provides GitHub repository link", () => {
      const { lastFrame } = render(<Help />);

      expect(lastFrame()).toContain("https://github.com/kodebaseai/kodebase");
    });

    it("includes call-to-action for more information", () => {
      const { lastFrame } = render(<Help />);

      expect(lastFrame()).toContain("For more information, visit:");
    });

    it("displays link at end of help text", () => {
      const { lastFrame } = render(<Help />);
      const output = lastFrame();

      const linkIndex = output.indexOf("https://github.com");
      const totalLength = output.length;

      // Link should be in last 20% of output
      expect(linkIndex).toBeGreaterThan(totalLength * 0.8);
    });
  });

  describe("structure and formatting", () => {
    it("organizes content in logical sections", () => {
      const { lastFrame } = render(<Help />);
      const output = lastFrame();

      const usageIndex = output.indexOf("Usage:");
      const commandsIndex = output.indexOf("Commands:");
      const optionsIndex = output.indexOf("Options:");

      // Sections should appear in order
      expect(usageIndex).toBeGreaterThan(0);
      expect(commandsIndex).toBeGreaterThan(usageIndex);
      expect(optionsIndex).toBeGreaterThan(commandsIndex);
    });

    it("indents command list under heading", () => {
      const { lastFrame } = render(<Help />);
      const output = lastFrame();

      const commandsIndex = output.indexOf("Commands:");
      const versionIndex = output.indexOf("version");

      // Commands should appear after heading
      expect(versionIndex).toBeGreaterThan(commandsIndex);
    });

    it("indents options list under heading", () => {
      const { lastFrame } = render(<Help />);
      const output = lastFrame();

      const optionsIndex = output.indexOf("Options:");
      const verboseIndex = output.indexOf("--verbose");

      // Options should appear after heading
      expect(verboseIndex).toBeGreaterThan(optionsIndex);
    });
  });

  describe("completeness invariants", () => {
    it("documents all command aliases consistently", () => {
      const { lastFrame } = render(<Help />);
      const output = lastFrame();

      // Each command should have long form, flag form, and short flag
      expect(output).toContain("version, --version, -v");
      expect(output).toContain("help, --help, -h");
    });

    it("provides description for every listed command", () => {
      const { lastFrame } = render(<Help />);
      const output = lastFrame();

      // After listing version command, should have description
      const versionIndex = output.indexOf("version");
      const versionDescIndex = output.indexOf("Display version information");
      expect(versionDescIndex).toBeGreaterThan(versionIndex);

      // After listing help command, should have description
      const helpIndex = output.indexOf("help,");
      const helpDescIndex = output.indexOf("Show this help message");
      expect(helpDescIndex).toBeGreaterThan(helpIndex);
    });

    it("provides description for every listed option", () => {
      const { lastFrame } = render(<Help />);
      const output = lastFrame();

      const verboseIndex = output.indexOf("--verbose");
      const verboseDescIndex = output.indexOf("Enable verbose output");

      expect(verboseDescIndex).toBeGreaterThan(verboseIndex);
    });
  });
});
