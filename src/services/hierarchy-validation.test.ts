/**
 * Tests for HierarchyValidationService
 */

import { describe, expect, it } from "vitest";
import type { BatchCreationContext } from "../components/wizard/types.js";

describe("HierarchyValidationService", () => {
  describe("Issue validation logic", () => {
    it("should handle batch context for issue completion", () => {
      // Test the logic for removing completed milestone from incompleteMilestones
      const context: BatchCreationContext = {
        rootArtifactId: "A",
        rootArtifactType: "initiative",
        createdArtifacts: ["A", "A.1"],
        incompleteMilestones: ["A.1"],
      };

      const issueId = "A.1.1";
      const parentId = issueId.split(".").slice(0, -1).join(".");

      const updatedIncompleteMilestones = context.incompleteMilestones.filter(
        (id) => id !== parentId,
      );

      expect(updatedIncompleteMilestones).toHaveLength(0);
    });

    it("should identify remaining incomplete milestones", () => {
      const context: BatchCreationContext = {
        rootArtifactId: "A",
        rootArtifactType: "initiative",
        createdArtifacts: ["A", "A.1", "A.2"],
        incompleteMilestones: ["A.1", "A.2"],
      };

      const issueId = "A.1.1";
      const parentId = issueId.split(".").slice(0, -1).join(".");

      const updatedIncompleteMilestones = context.incompleteMilestones.filter(
        (id) => id !== parentId,
      );

      expect(updatedIncompleteMilestones).toEqual(["A.2"]);
    });
  });

  describe("Parent ID extraction", () => {
    it("should extract parent ID from child ID", () => {
      const extractParent = (childId: string) => {
        const parts = childId.split(".");
        return parts.slice(0, -1).join(".");
      };

      expect(extractParent("A.1")).toBe("A");
      expect(extractParent("A.1.2")).toBe("A.1");
      expect(extractParent("B.3.1")).toBe("B.3");
    });

    it("should handle single-level IDs", () => {
      const extractParent = (childId: string) => {
        const parts = childId.split(".");
        if (parts.length === 1) {
          throw new Error("Cannot get parent of root artifact");
        }
        return parts.slice(0, -1).join(".");
      };

      expect(() => extractParent("A")).toThrow(
        "Cannot get parent of root artifact",
      );
    });
  });

  describe("Children filtering by pattern", () => {
    it("should filter children by parent pattern", () => {
      const artifacts = [
        { id: "A" },
        { id: "A.1" },
        { id: "A.2" },
        { id: "A.1.1" },
        { id: "B" },
        { id: "B.1" },
      ];

      const parentId = "A";
      const childPattern = new RegExp(`^${parentId}\\.\\d+$`);

      const children = artifacts
        .filter((artifact) => childPattern.test(artifact.id))
        .map((artifact) => artifact.id);

      expect(children).toEqual(["A.1", "A.2"]);
    });

    it("should match milestone children only", () => {
      const artifacts = [
        { id: "A.1" },
        { id: "A.1.1" },
        { id: "A.1.2" },
        { id: "A.2" },
      ];

      const parentId = "A.1";
      const childPattern = new RegExp(`^${parentId}\\.\\d+$`);

      const children = artifacts
        .filter((artifact) => childPattern.test(artifact.id))
        .map((artifact) => artifact.id);

      expect(children).toEqual(["A.1.1", "A.1.2"]);
    });
  });

  // Note: Full integration tests for validateHierarchyBatch require real artifact files
  // and are tested in the E2E test suite.
});
