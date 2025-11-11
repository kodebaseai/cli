/**
 * Tests for terminal utility functions
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createSeparator,
  getTerminalHeight,
  getTerminalSize,
  getTerminalWidth,
  isTTY,
} from "./terminal.js";

describe("terminal utilities", () => {
  describe("getTerminalWidth", () => {
    const originalStdoutColumns = process.stdout.columns;
    const originalStderrColumns = process.stderr.columns;

    afterEach(() => {
      process.stdout.columns = originalStdoutColumns;
      process.stderr.columns = originalStderrColumns;
    });

    it("returns stdout columns when available", () => {
      process.stdout.columns = 120;
      expect(getTerminalWidth()).toBe(120);
    });

    it("falls back to stderr columns when stdout is unavailable", () => {
      process.stdout.columns = undefined;
      process.stderr.columns = 100;
      expect(getTerminalWidth()).toBe(100);
    });

    it("returns default width when neither stdout nor stderr have columns", () => {
      process.stdout.columns = undefined;
      process.stderr.columns = undefined;
      expect(getTerminalWidth()).toBe(80);
    });

    it("clamps width to minimum of 40", () => {
      process.stdout.columns = 20;
      expect(getTerminalWidth()).toBe(40);
    });

    it("clamps width to maximum of 200", () => {
      process.stdout.columns = 300;
      expect(getTerminalWidth()).toBe(200);
    });
  });

  describe("getTerminalHeight", () => {
    const originalStdoutRows = process.stdout.rows;
    const originalStderrRows = process.stderr.rows;

    afterEach(() => {
      process.stdout.rows = originalStdoutRows;
      process.stderr.rows = originalStderrRows;
    });

    it("returns stdout rows when available", () => {
      process.stdout.rows = 50;
      expect(getTerminalHeight()).toBe(50);
    });

    it("falls back to stderr rows when stdout is unavailable", () => {
      process.stdout.rows = undefined;
      process.stderr.rows = 40;
      expect(getTerminalHeight()).toBe(40);
    });

    it("returns default height when neither stdout nor stderr have rows", () => {
      process.stdout.rows = undefined;
      process.stderr.rows = undefined;
      expect(getTerminalHeight()).toBe(24);
    });

    it("clamps height to minimum of 10", () => {
      process.stdout.rows = 5;
      expect(getTerminalHeight()).toBe(10);
    });

    it("clamps height to maximum of 100", () => {
      process.stdout.rows = 150;
      expect(getTerminalHeight()).toBe(100);
    });
  });

  describe("getTerminalSize", () => {
    const originalStdoutColumns = process.stdout.columns;
    const originalStdoutRows = process.stdout.rows;

    afterEach(() => {
      process.stdout.columns = originalStdoutColumns;
      process.stdout.rows = originalStdoutRows;
    });

    it("returns both width and height", () => {
      process.stdout.columns = 120;
      process.stdout.rows = 40;

      const size = getTerminalSize();
      expect(size).toEqual({ width: 120, height: 40 });
    });
  });

  describe("createSeparator", () => {
    const originalStdoutColumns = process.stdout.columns;

    beforeEach(() => {
      process.stdout.columns = 100;
    });

    afterEach(() => {
      process.stdout.columns = originalStdoutColumns;
    });

    it("creates separator using default character", () => {
      const separator = createSeparator();
      expect(separator).toBe("━".repeat(100));
    });

    it("creates separator using custom character", () => {
      const separator = createSeparator("-");
      expect(separator).toBe("-".repeat(100));
    });

    it("creates separator with specific width", () => {
      const separator = createSeparator("━", 50);
      expect(separator).toBe("━".repeat(50));
      expect(separator.length).toBe(50);
    });

    it("respects maxWidth when terminal is wider", () => {
      process.stdout.columns = 120;
      const separator = createSeparator("━", undefined, 80);
      expect(separator).toBe("━".repeat(80));
      expect(separator.length).toBe(80);
    });

    it("uses terminal width when maxWidth is larger", () => {
      process.stdout.columns = 60;
      const separator = createSeparator("━", undefined, 100);
      expect(separator).toBe("━".repeat(60));
      expect(separator.length).toBe(60);
    });

    it("uses specified width over maxWidth when width is provided", () => {
      const separator = createSeparator("━", 50, 100);
      expect(separator).toBe("━".repeat(50));
      expect(separator.length).toBe(50);
    });
  });

  describe("isTTY", () => {
    const originalIsTTY = process.stdout.isTTY;

    afterEach(() => {
      process.stdout.isTTY = originalIsTTY;
    });

    it("returns true when stdout is a TTY", () => {
      process.stdout.isTTY = true;
      expect(isTTY()).toBe(true);
    });

    it("returns false when stdout is not a TTY", () => {
      process.stdout.isTTY = false;
      expect(isTTY()).toBe(false);
    });

    it("returns false when isTTY is undefined", () => {
      process.stdout.isTTY = undefined;
      expect(isTTY()).toBe(false);
    });
  });
});
