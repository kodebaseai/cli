/**
 * Integration tests for WizardFlow component
 */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_WIZARD_STATE,
  STEP_ORDER_IDE,
  STEP_ORDER_WEB,
} from "./types.js";

describe("WizardFlow", () => {
  describe("Step configuration", () => {
    it("should have correct IDE step order", () => {
      expect(STEP_ORDER_IDE).toEqual([
        "type-parent-selection",
        "objective-input",
        "ai-prompt-generation",
        "ai-completion-wait",
        "preview-confirmation",
      ]);
    });

    it("should have correct Web step order", () => {
      expect(STEP_ORDER_WEB).toEqual([
        "type-parent-selection",
        "objective-input",
        "ai-prompt-generation",
        "ai-response-input",
        "preview-confirmation",
      ]);
    });

    it("should have 5 steps in both flows", () => {
      expect(STEP_ORDER_IDE).toHaveLength(5);
      expect(STEP_ORDER_WEB).toHaveLength(5);
    });

    it("should differ only in step 4", () => {
      for (let i = 0; i < 5; i++) {
        if (i === 3) {
          expect(STEP_ORDER_IDE[i]).toBe("ai-completion-wait");
          expect(STEP_ORDER_WEB[i]).toBe("ai-response-input");
        } else {
          expect(STEP_ORDER_IDE[i]).toBe(STEP_ORDER_WEB[i]);
        }
      }
    });
  });

  describe("Default wizard state", () => {
    it("should have correct initial state", () => {
      expect(DEFAULT_WIZARD_STATE).toEqual({
        currentStep: "type-parent-selection",
        aiEnvironment: "web",
        objective: "",
        isComplete: false,
        errors: {},
      });
    });

    it("should start at first step", () => {
      expect(DEFAULT_WIZARD_STATE.currentStep).toBe("type-parent-selection");
    });

    it("should default to web environment", () => {
      expect(DEFAULT_WIZARD_STATE.aiEnvironment).toBe("web");
    });

    it("should not be complete initially", () => {
      expect(DEFAULT_WIZARD_STATE.isComplete).toBe(false);
    });
  });
});
