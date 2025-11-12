/**
 * Behavioral tests for Tutorial State Persistence
 *
 * Invariants:
 * - Saves tutorial state to persistent storage
 * - Loads saved state correctly
 * - Handles missing or corrupted state gracefully
 * - Clears state on completion
 * - Creates backups before clearing
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TutorialState } from "../components/tutorial/types.js";
import {
  clearTutorialState,
  getSavedProgressDescription,
  hasSavedTutorialState,
  loadTutorialState,
  saveTutorialState,
} from "./tutorial-state.js";

const TEST_STATE_DIR = join(homedir(), ".kodebase", "tutorial");
const TEST_STATE_FILE = join(TEST_STATE_DIR, "progress.json");

describe("Tutorial state persistence", () => {
  // Clean up before and after each test
  beforeEach(() => {
    if (existsSync(TEST_STATE_FILE)) {
      rmSync(TEST_STATE_FILE);
    }
  });

  afterEach(() => {
    if (existsSync(TEST_STATE_FILE)) {
      rmSync(TEST_STATE_FILE);
    }
    const backupFile = `${TEST_STATE_FILE}.backup`;
    if (existsSync(backupFile)) {
      rmSync(backupFile);
    }
  });

  describe("saving state", () => {
    it("creates state directory if it doesn't exist", () => {
      if (existsSync(TEST_STATE_DIR)) {
        rmSync(TEST_STATE_DIR, { recursive: true });
      }

      const state: TutorialState = {
        currentStep: "concepts",
        completedSteps: ["welcome"],
        sandboxPath: "/tmp/test-sandbox",
        isReady: true,
        createdArtifacts: {},
        progress: { welcome: true },
      };

      saveTutorialState(state);

      expect(existsSync(TEST_STATE_DIR)).toBe(true);
    });

    it("saves state to progress.json", () => {
      const state: TutorialState = {
        currentStep: "concepts",
        completedSteps: ["welcome"],
        sandboxPath: "/tmp/test-sandbox",
        isReady: true,
        createdArtifacts: {},
        progress: { welcome: true },
      };

      saveTutorialState(state);

      expect(existsSync(TEST_STATE_FILE)).toBe(true);
    });

    it("includes all state properties", () => {
      const state: TutorialState = {
        currentStep: "create-initiative",
        completedSteps: ["welcome", "concepts"],
        sandboxPath: "/tmp/test-sandbox-123",
        isReady: true,
        createdArtifacts: {
          initiative: "A",
        },
        progress: {
          welcome: true,
          concepts: true,
        },
      };

      saveTutorialState(state);
      const loaded = loadTutorialState();

      expect(loaded?.currentStep).toBe("create-initiative");
      expect(loaded?.completedSteps).toEqual(["welcome", "concepts"]);
      expect(loaded?.sandboxPath).toBe("/tmp/test-sandbox-123");
      expect(loaded?.isReady).toBe(true);
      expect(loaded?.createdArtifacts.initiative).toBe("A");
    });

    it("handles save failures gracefully (non-critical)", () => {
      const state: TutorialState = {
        currentStep: "concepts",
        completedSteps: ["welcome"],
        sandboxPath: "/tmp/test-sandbox",
        isReady: true,
        createdArtifacts: {},
        progress: {},
      };

      // Should not throw even if directory is not writable
      expect(() => saveTutorialState(state)).not.toThrow();
    });
  });

  describe("loading state", () => {
    it("returns null when no saved state exists", () => {
      const loaded = loadTutorialState();

      expect(loaded).toBeNull();
    });

    it("loads saved state correctly", () => {
      const state: TutorialState = {
        currentStep: "create-milestone",
        completedSteps: ["welcome", "concepts", "create-initiative"],
        sandboxPath: "/tmp/test-sandbox",
        isReady: true,
        createdArtifacts: {
          initiative: "A",
          milestone: "A.1",
        },
        progress: {
          welcome: true,
          concepts: true,
          "create-initiative": true,
        },
      };

      saveTutorialState(state);
      const loaded = loadTutorialState();

      expect(loaded).not.toBeNull();
      expect(loaded?.currentStep).toBe("create-milestone");
      expect(loaded?.completedSteps.length).toBe(3);
    });

    it("validates required fields", () => {
      // Create invalid state (missing required fields)
      mkdirSync(TEST_STATE_DIR, { recursive: true });
      writeFileSync(
        TEST_STATE_FILE,
        JSON.stringify({
          currentStep: "concepts",
          // missing completedSteps and sandboxPath
        }),
      );

      const loaded = loadTutorialState();

      expect(loaded).toBeNull();
    });

    it("handles corrupted JSON gracefully", () => {
      mkdirSync(TEST_STATE_DIR, { recursive: true });
      writeFileSync(TEST_STATE_FILE, "{ invalid json");

      const loaded = loadTutorialState();

      expect(loaded).toBeNull();
    });

    it("removes metadata fields from loaded state", () => {
      const state: TutorialState = {
        currentStep: "concepts",
        completedSteps: ["welcome"],
        sandboxPath: "/tmp/test-sandbox",
        isReady: true,
        createdArtifacts: {},
        progress: {},
      };

      saveTutorialState(state);
      const loaded = loadTutorialState();

      // Should not include lastSaved or version
      expect(loaded).not.toHaveProperty("lastSaved");
      expect(loaded).not.toHaveProperty("version");
    });
  });

  describe("clearing state", () => {
    it("creates backup before clearing", () => {
      const state: TutorialState = {
        currentStep: "completion",
        completedSteps: ["welcome", "concepts"],
        sandboxPath: "/tmp/test-sandbox",
        isReady: true,
        createdArtifacts: {},
        progress: {},
      };

      saveTutorialState(state);
      clearTutorialState();

      const backupFile = `${TEST_STATE_FILE}.backup`;
      expect(existsSync(backupFile)).toBe(true);
    });

    it("clears current state file", () => {
      const state: TutorialState = {
        currentStep: "completion",
        completedSteps: ["welcome", "concepts"],
        sandboxPath: "/tmp/test-sandbox",
        isReady: true,
        createdArtifacts: {},
        progress: {},
      };

      saveTutorialState(state);
      clearTutorialState();

      const loaded = loadTutorialState();
      expect(loaded).toBeNull();
    });

    it("handles clearing non-existent state gracefully", () => {
      expect(() => clearTutorialState()).not.toThrow();
    });
  });

  describe("state checking", () => {
    it("returns false when no saved state exists", () => {
      expect(hasSavedTutorialState()).toBe(false);
    });

    it("returns true when valid saved state exists", () => {
      const state: TutorialState = {
        currentStep: "concepts",
        completedSteps: ["welcome"],
        sandboxPath: "/tmp/test-sandbox",
        isReady: true,
        createdArtifacts: {},
        progress: {},
      };

      saveTutorialState(state);

      expect(hasSavedTutorialState()).toBe(true);
    });

    it("returns false for initial welcome state", () => {
      const state: TutorialState = {
        currentStep: "welcome",
        completedSteps: [],
        sandboxPath: "/tmp/test-sandbox",
        isReady: true,
        createdArtifacts: {},
        progress: {},
      };

      saveTutorialState(state);

      expect(hasSavedTutorialState()).toBe(false);
    });
  });

  describe("progress description", () => {
    it("returns null when no saved state exists", () => {
      expect(getSavedProgressDescription()).toBeNull();
    });

    it("provides human-readable description of progress", () => {
      const state: TutorialState = {
        currentStep: "create-milestone",
        completedSteps: ["welcome", "concepts", "create-initiative"],
        sandboxPath: "/tmp/test-sandbox",
        isReady: true,
        createdArtifacts: {},
        progress: {},
      };

      saveTutorialState(state);
      const description = getSavedProgressDescription();

      expect(description).not.toBeNull();
      expect(description).toContain("Creating Milestone");
      expect(description).toContain("3 steps completed");
    });

    it("includes current step name", () => {
      const state: TutorialState = {
        currentStep: "git-integration",
        completedSteps: [
          "welcome",
          "concepts",
          "create-initiative",
          "create-milestone",
          "create-issue",
        ],
        sandboxPath: "/tmp/test-sandbox",
        isReady: true,
        createdArtifacts: {},
        progress: {},
      };

      saveTutorialState(state);
      const description = getSavedProgressDescription();

      expect(description).toContain("Git Workflow Demo");
    });

    it("includes completed steps count", () => {
      const state: TutorialState = {
        currentStep: "completion",
        completedSteps: [
          "welcome",
          "concepts",
          "create-initiative",
          "create-milestone",
          "create-issue",
          "git-integration",
        ],
        sandboxPath: "/tmp/test-sandbox",
        isReady: true,
        createdArtifacts: {},
        progress: {},
      };

      saveTutorialState(state);
      const description = getSavedProgressDescription();

      expect(description).toContain("6 steps completed");
    });
  });
});
