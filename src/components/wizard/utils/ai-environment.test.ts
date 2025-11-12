/**
 * Tests for AI environment detection utilities
 */

import { describe, expect, it } from "vitest";
import { getAIEnvironmentName } from "./ai-environment.js";

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
