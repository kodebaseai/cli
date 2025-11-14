/**
 * Tests for parent validation utilities
 */

import type { BlockingReason } from "@kodebase/artifacts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  inferArtifactType,
  validateParent,
  validateParentExists,
  validateParentReady,
} from "./parent-validation.js";

// Create mock instances
const mockGetArtifact = vi.fn();
const mockIsReady = vi.fn();
const mockGetBlockingReasons = vi.fn();

// Mock the @kodebase/artifacts module with proper constructors
vi.mock("@kodebase/artifacts", () => ({
  ArtifactService: vi.fn(function ArtifactService() {
    return {
      getArtifact: mockGetArtifact,
    };
  }),
  ReadinessService: vi.fn(function ReadinessService() {
    return {
      isReady: mockIsReady,
      getBlockingReasons: mockGetBlockingReasons,
    };
  }),
}));

describe("parent-validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("inferArtifactType", () => {
    it("should return initiative when no parent", () => {
      expect(inferArtifactType(undefined)).toBe("initiative");
    });

    it("should return milestone when parent is initiative (depth 1)", () => {
      expect(inferArtifactType("A")).toBe("milestone");
      expect(inferArtifactType("B")).toBe("milestone");
      expect(inferArtifactType("Z")).toBe("milestone");
    });

    it("should return issue when parent is milestone (depth 2)", () => {
      expect(inferArtifactType("A.1")).toBe("issue");
      expect(inferArtifactType("B.3")).toBe("issue");
      expect(inferArtifactType("A.10")).toBe("issue");
    });

    it("should throw error when parent is issue (depth 3)", () => {
      expect(() => inferArtifactType("A.1.1")).toThrow(
        "Issues (depth 3) cannot have children",
      );
      expect(() => inferArtifactType("B.2.5")).toThrow("cannot have children");
    });

    it("should throw error for invalid depth", () => {
      expect(() => inferArtifactType("A.1.1.1")).toThrow(
        "cannot have children",
      );
    });
  });

  describe("validateParentExists", () => {
    it("should return valid when parent artifact exists", async () => {
      mockGetArtifact.mockResolvedValue({
        metadata: { id: "A", title: "Test Initiative" },
      });

      const result = await validateParentExists("A");

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.suggestion).toBeUndefined();
      expect(mockGetArtifact).toHaveBeenCalledWith({
        id: "A",
        baseDir: undefined,
      });
    });

    it("should return valid when parent artifact exists with custom baseDir", async () => {
      mockGetArtifact.mockResolvedValue({
        metadata: { id: "A.1", title: "Test Milestone" },
      });

      const result = await validateParentExists("A.1", "/custom/path");

      expect(result.valid).toBe(true);
      expect(mockGetArtifact).toHaveBeenCalledWith({
        id: "A.1",
        baseDir: "/custom/path",
      });
    });

    it("should return invalid when parent artifact does not exist", async () => {
      mockGetArtifact.mockRejectedValue(new Error("Not found"));

      const result = await validateParentExists("B");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Parent artifact 'B' not found");
      expect(result.suggestion).toBe(
        "Use 'kb status --all' to see available artifacts",
      );
    });

    it("should return invalid when getArtifact throws error", async () => {
      mockGetArtifact.mockRejectedValue(new Error("File system error"));

      const result = await validateParentExists("A.1");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Parent artifact 'A.1' not found");
    });
  });

  describe("validateParentReady", () => {
    it("should return valid when parent is ready", async () => {
      mockIsReady.mockResolvedValue(true);

      const result = await validateParentReady("A");

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.blockingReasons).toBeUndefined();
      expect(result.suggestion).toBeUndefined();
      expect(mockIsReady).toHaveBeenCalledWith("A");
    });

    it("should return valid when parent is ready with custom baseDir", async () => {
      mockIsReady.mockResolvedValue(true);

      const result = await validateParentReady("A.1", "/custom/path");

      expect(result.valid).toBe(true);
      expect(mockIsReady).toHaveBeenCalledWith("A.1");
    });

    it("should return invalid when parent is not ready", async () => {
      const blockingReasons: BlockingReason[] = [
        {
          type: "blocked_dependency",
          message: "Waiting on dependency A.2",
          artifactId: "A.2",
        },
      ];
      mockIsReady.mockResolvedValue(false);
      mockGetBlockingReasons.mockResolvedValue(blockingReasons);

      const result = await validateParentReady("A");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Parent artifact 'A' is not ready");
      expect(result.blockingReasons).toEqual(blockingReasons);
      expect(result.suggestion).toBe(
        "Complete blocked dependencies before adding children to 'A'",
      );
      expect(mockIsReady).toHaveBeenCalledWith("A");
      expect(mockGetBlockingReasons).toHaveBeenCalledWith("A");
    });

    it("should return invalid with multiple blocking reasons", async () => {
      const blockingReasons: BlockingReason[] = [
        {
          type: "blocked_dependency",
          message: "Waiting on A.2",
          artifactId: "A.2",
        },
        {
          type: "incomplete_child",
          message: "Child A.1.1 incomplete",
          artifactId: "A.1.1",
        },
      ];
      mockIsReady.mockResolvedValue(false);
      mockGetBlockingReasons.mockResolvedValue(blockingReasons);

      const result = await validateParentReady("A.1");

      expect(result.valid).toBe(false);
      expect(result.blockingReasons).toHaveLength(2);
    });
  });

  describe("validateParent", () => {
    it("should return valid when parent exists and is ready", async () => {
      mockGetArtifact.mockResolvedValue({
        metadata: { id: "A", title: "Test" },
      });
      mockIsReady.mockResolvedValue(true);

      const result = await validateParent("A");

      expect(result.valid).toBe(true);
      expect(mockGetArtifact).toHaveBeenCalledWith({
        id: "A",
        baseDir: undefined,
      });
      expect(mockIsReady).toHaveBeenCalledWith("A");
    });

    it("should return invalid when parent does not exist (without checking readiness)", async () => {
      mockGetArtifact.mockRejectedValue(new Error("Not found"));
      mockIsReady.mockResolvedValue(true);

      const result = await validateParent("B");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Parent artifact 'B' not found");
      expect(result.suggestion).toBe(
        "Use 'kb status --all' to see available artifacts",
      );
      // isReady should not be called if parent doesn't exist
      expect(mockIsReady).not.toHaveBeenCalled();
    });

    it("should return invalid when parent exists but is not ready", async () => {
      mockGetArtifact.mockResolvedValue({
        metadata: { id: "A.1", title: "Test" },
      });
      const blockingReasons: BlockingReason[] = [
        {
          type: "blocked_dependency",
          message: "Waiting on A.2",
          artifactId: "A.2",
        },
      ];
      mockIsReady.mockResolvedValue(false);
      mockGetBlockingReasons.mockResolvedValue(blockingReasons);

      const result = await validateParent("A.1");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Parent artifact 'A.1' is not ready");
      expect(result.blockingReasons).toEqual(blockingReasons);
      expect(result.suggestion).toBe(
        "Complete blocked dependencies before adding children to 'A.1'",
      );
      expect(mockGetArtifact).toHaveBeenCalled();
      expect(mockIsReady).toHaveBeenCalled();
    });

    it("should work with custom baseDir", async () => {
      const customBaseDir = "/custom/path";
      mockGetArtifact.mockResolvedValue({
        metadata: { id: "A", title: "Test" },
      });
      mockIsReady.mockResolvedValue(true);

      const result = await validateParent("A", customBaseDir);

      expect(result.valid).toBe(true);
      expect(mockGetArtifact).toHaveBeenCalledWith({
        id: "A",
        baseDir: customBaseDir,
      });
    });
  });
});
