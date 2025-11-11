/**
 * Behavioral tests for RelationshipList component
 *
 * Invariants:
 * - Empty relationships show "No relationships" message
 * - Blocked_by relationships are labeled as "Blocked by" when status is blocked
 * - Blocked_by relationships are labeled as "Dependencies" when status is not blocked
 * - Dependencies show ✓ checkmark when resolved (in_progress, in_review, completed)
 * - Dependencies are colored green when resolved, default color otherwise
 * - Blocks relationships are always shown in yellow
 */

import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { RelationshipList } from "./RelationshipList.js";

describe("RelationshipList relationship display", () => {
  describe("empty state", () => {
    it("displays 'No relationships' message when both arrays are empty", () => {
      const { lastFrame } = render(
        <RelationshipList blocks={[]} blockedBy={[]} />,
      );

      expect(lastFrame()).toContain("No relationships");
    });
  });

  describe("blocks relationships", () => {
    it("displays blocks section when artifacts are blocking others", () => {
      const { lastFrame } = render(
        <RelationshipList blocks={["A.1.2", "A.1.3"]} blockedBy={[]} />,
      );

      expect(lastFrame()).toContain("Blocks:");
      expect(lastFrame()).toContain("A.1.2");
      expect(lastFrame()).toContain("A.1.3");
    });

    it("does not display blocks section when blocks array is empty", () => {
      const { lastFrame } = render(
        <RelationshipList blocks={[]} blockedBy={["A.1"]} />,
      );

      expect(lastFrame()).not.toContain("Blocks:");
    });
  });

  describe("blockedBy relationships", () => {
    it("displays 'Dependencies:' label when not blocked", () => {
      const { lastFrame } = render(
        <RelationshipList
          blocks={[]}
          blockedBy={["A.1"]}
          currentStatus="draft"
        />,
      );

      expect(lastFrame()).toContain("Dependencies:");
    });

    it("displays 'Blocked by:' label when status is blocked", () => {
      const { lastFrame } = render(
        <RelationshipList
          blocks={[]}
          blockedBy={["A.1"]}
          currentStatus="blocked"
        />,
      );

      expect(lastFrame()).toContain("Blocked by:");
    });

    it("displays all blocked_by artifact IDs", () => {
      const { lastFrame } = render(
        <RelationshipList
          blocks={[]}
          blockedBy={["A.1", "A.2", "B.1.1"]}
          currentStatus="draft"
        />,
      );

      expect(lastFrame()).toContain("A.1");
      expect(lastFrame()).toContain("A.2");
      expect(lastFrame()).toContain("B.1.1");
    });
  });

  describe("dependency resolution status", () => {
    it('marks dependencies as "(resolved)" when status is in_progress', () => {
      const { lastFrame } = render(
        <RelationshipList
          blocks={[]}
          blockedBy={["A.1"]}
          currentStatus="in_progress"
        />,
      );

      expect(lastFrame()).toContain("(resolved)");
    });

    it('marks dependencies as "(resolved)" when status is in_review', () => {
      const { lastFrame } = render(
        <RelationshipList
          blocks={[]}
          blockedBy={["A.1"]}
          currentStatus="in_review"
        />,
      );

      expect(lastFrame()).toContain("(resolved)");
    });

    it('marks dependencies as "(resolved)" when status is completed', () => {
      const { lastFrame } = render(
        <RelationshipList
          blocks={[]}
          blockedBy={["A.1"]}
          currentStatus="completed"
        />,
      );

      expect(lastFrame()).toContain("(resolved)");
    });

    it("does not mark dependencies as resolved when status is draft", () => {
      const { lastFrame } = render(
        <RelationshipList
          blocks={[]}
          blockedBy={["A.1"]}
          currentStatus="draft"
        />,
      );

      expect(lastFrame()).not.toContain("(resolved)");
    });

    it("does not mark dependencies as resolved when status is blocked", () => {
      const { lastFrame } = render(
        <RelationshipList
          blocks={[]}
          blockedBy={["A.1"]}
          currentStatus="blocked"
        />,
      );

      expect(lastFrame()).not.toContain("(resolved)");
    });
  });

  describe("dependency resolution checkmark", () => {
    it("displays ✓ checkmark when dependencies are resolved", () => {
      const { lastFrame } = render(
        <RelationshipList
          blocks={[]}
          blockedBy={["A.1"]}
          currentStatus="in_progress"
        />,
      );

      expect(lastFrame()).toContain("✓");
    });

    it("does not display checkmark when dependencies are not resolved", () => {
      const { lastFrame } = render(
        <RelationshipList
          blocks={[]}
          blockedBy={["A.1"]}
          currentStatus="draft"
        />,
      );

      expect(lastFrame()).not.toContain("✓");
    });
  });

  describe("mixed relationships", () => {
    it("displays both blocks and blockedBy sections when both are present", () => {
      const { lastFrame } = render(
        <RelationshipList
          blocks={["A.1.2", "A.1.3"]}
          blockedBy={["A.1"]}
          currentStatus="in_progress"
        />,
      );

      expect(lastFrame()).toContain("Relationships:");
      expect(lastFrame()).toContain("Dependencies:");
      expect(lastFrame()).toContain("Blocks:");
      expect(lastFrame()).toContain("A.1");
      expect(lastFrame()).toContain("A.1.2");
      expect(lastFrame()).toContain("A.1.3");
    });
  });

  describe("status invariants", () => {
    it("handles undefined currentStatus gracefully", () => {
      const { lastFrame } = render(
        <RelationshipList blocks={[]} blockedBy={["A.1"]} />,
      );

      expect(lastFrame()).toContain("Dependencies:");
      expect(lastFrame()).not.toContain("(resolved)");
    });

    it("handles all standard artifact statuses", () => {
      const statuses = [
        "draft",
        "ready",
        "in_progress",
        "in_review",
        "completed",
        "blocked",
        "cancelled",
        "archived",
      ];

      for (const status of statuses) {
        const { lastFrame } = render(
          <RelationshipList
            blocks={["A.1.2"]}
            blockedBy={["A.1"]}
            currentStatus={status}
          />,
        );

        expect(lastFrame()).toBeDefined();
        expect(lastFrame()).toContain("Relationships:");
      }
    });
  });
});
