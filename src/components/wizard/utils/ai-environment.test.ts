/**
 * Tests for AI environment detection utilities
 */

import fs from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { detectAIEnvironment, getAIEnvironmentName } from "./ai-environment.js";

// Mock fs module
vi.mock("node:fs/promises");

describe("ai-environment utilities", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create a clean copy of environment without IDE-related vars
    const cleanEnv = { ...originalEnv };
    delete cleanEnv.CURSOR_IDE;
    delete cleanEnv.VSCODE_CURSOR;
    delete cleanEnv.VSCODE_PID;
    delete cleanEnv.TERM_PROGRAM;
    process.env = cleanEnv;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe("detectAIEnvironment", () => {
    it("should detect IDE environment from agent config with ide_composer", async () => {
      const mockConfig = `
agents:
  cursor:
    available: true
    integrationTypes:
      - ide_composer
    primary: true
`;
      vi.mocked(fs.readFile).mockResolvedValue(mockConfig);

      const result = await detectAIEnvironment();

      expect(result).toBe("ide");
      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining(".kodebase/config/settings.yml"),
        "utf-8",
      );
    });

    it("should detect web environment from agent config without ide_composer", async () => {
      const mockConfig = `
agents:
  chatgpt:
    available: true
    integrationTypes:
      - web_chat
    primary: true
`;
      vi.mocked(fs.readFile).mockResolvedValue(mockConfig);

      const result = await detectAIEnvironment();

      expect(result).toBe("web");
    });

    it("should detect IDE from CURSOR_IDE environment variable", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(
        new Error("Config file not found"),
      );
      process.env.CURSOR_IDE = "1";

      const result = await detectAIEnvironment();

      expect(result).toBe("ide");
    });

    it("should detect IDE from VSCODE_CURSOR environment variable", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(
        new Error("Config file not found"),
      );
      process.env.VSCODE_CURSOR = "1";

      const result = await detectAIEnvironment();

      expect(result).toBe("ide");
    });

    it("should detect IDE from VSCODE_PID environment variable", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(
        new Error("Config file not found"),
      );
      process.env.VSCODE_PID = "12345";

      const result = await detectAIEnvironment();

      expect(result).toBe("ide");
    });

    it("should detect IDE from TERM_PROGRAM=vscode", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(
        new Error("Config file not found"),
      );
      process.env.TERM_PROGRAM = "vscode";

      const result = await detectAIEnvironment();

      expect(result).toBe("ide");
    });

    it("should default to web when no IDE indicators are present", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(
        new Error("Config file not found"),
      );
      // IDE env vars are already cleared in beforeEach

      const result = await detectAIEnvironment();

      expect(result).toBe("web");
    });

    it("should use custom baseDir when provided", async () => {
      const customDir = "/custom/path";
      vi.mocked(fs.readFile).mockRejectedValue(
        new Error("Config file not found"),
      );

      await detectAIEnvironment(customDir);

      expect(fs.readFile).toHaveBeenCalledWith(
        `${customDir}/.kodebase/config/settings.yml`,
        "utf-8",
      );
    });

    it("should handle empty agent config", async () => {
      const mockConfig = `
agents: {}
`;
      vi.mocked(fs.readFile).mockResolvedValue(mockConfig);

      const result = await detectAIEnvironment();

      expect(result).toBe("web");
    });

    it("should handle config without agents field", async () => {
      const mockConfig = `
other_setting: value
`;
      vi.mocked(fs.readFile).mockResolvedValue(mockConfig);

      const result = await detectAIEnvironment();

      expect(result).toBe("web");
    });

    it("should fallback to environment variables when config has no IDE composer", async () => {
      const mockConfig = `
agents:
  chatgpt:
    available: true
    integrationTypes:
      - web_chat
`;
      vi.mocked(fs.readFile).mockResolvedValue(mockConfig);
      process.env.CURSOR_IDE = "1"; // Set IDE env var

      const result = await detectAIEnvironment();

      // Config doesn't have IDE composer, so fallback to env var detection
      expect(result).toBe("ide");
    });
  });

  describe("getAIEnvironmentName", () => {
    it("should return friendly name for IDE environment", () => {
      expect(getAIEnvironmentName("ide")).toBe("IDE (Cursor, VSCode, etc.)");
    });

    it("should return friendly name for web environment", () => {
      expect(getAIEnvironmentName("web")).toBe(
        "Web-based AI (ChatGPT, Claude, etc.)",
      );
    });
  });
});
