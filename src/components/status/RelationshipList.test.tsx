/**
 * Behavioral tests for RelationshipList component
 *
 * Invariants:
 * - Empty relationships render nothing
 * - Blocked_by relationships are labeled as "Blocked by" when status is blocked
 * - Blocked_by relationships are labeled as "Dependencies" when status is not blocked
 * - Dependencies show ✓ when resolved (green) or ✗ when not resolved (red)
 * - Dependencies are displayed horizontally
 * - Blocks relationships are shown as comma-separated inline list
 */

import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { RelationshipList } from "./RelationshipList.js";

describe("RelationshipList relationship display", () => {
  describe("empty state", () => {
    it("renders nothing when both arrays are empty", () => {
      const { lastFrame } = render(
        <RelationshipList blocks={[]} blockedBy={[]} />,
      );

      expect(lastFrame()).toBe("");
    });
  });

  describe("blocks relationships", () => {
    it("displays blocks section when artifacts are blocking others", () => {
      const { lastFrame } = render(
        <RelationshipList blocks={["A.1.2", "A.1.3"]} blockedBy={[]} />,
      );

      expect(lastFrame()).toContain("Blocks: A.1.2, A.1.3");
    });

    it("does not display blocks section when blocks array is empty", () => {
      const { lastFrame } = render(
        <RelationshipList blocks={[]} blockedBy={["A.1"]} />,
      );

      expect(lastFrame()).not.toContain("Blocks:");
    });
  });

  describe("blockedBy relationships", () => {
    it("displays 'Dependencies' label when not blocked", () => {
      const { lastFrame } = render(
        <RelationshipList
          blocks={[]}
          blockedBy={["A.1"]}
          currentStatus="draft"
        />,
      );

      expect(lastFrame()).toContain("Dependencies");
      expect(lastFrame()).toContain("✗ A.1");
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
    it("shows green ✓ when dependencies resolved (in_progress)", () => {
      const { lastFrame } = render(
        <RelationshipList
          blocks={[]}
          blockedBy={["A.1"]}
          currentStatus="in_progress"
        />,
      );

      expect(lastFrame()).toContain("✓ A.1");
      expect(lastFrame()).toContain("Dependencies");
    });

    it("shows green ✓ when dependencies resolved (in_review)", () => {
      const { lastFrame } = render(
        <RelationshipList
          blocks={[]}
          blockedBy={["A.1"]}
          currentStatus="in_review"
        />,
      );

      expect(lastFrame()).toContain("✓ A.1");
      expect(lastFrame()).toContain("Dependencies");
    });

    it("shows green ✓ when dependencies resolved (completed)", () => {
      const { lastFrame } = render(
        <RelationshipList
          blocks={[]}
          blockedBy={["A.1"]}
          currentStatus="completed"
        />,
      );

      expect(lastFrame()).toContain("✓ A.1");
      expect(lastFrame()).toContain("Dependencies");
    });

    it("shows red ✗ when dependencies not resolved (draft)", () => {
      const { lastFrame } = render(
        <RelationshipList
          blocks={[]}
          blockedBy={["A.1"]}
          currentStatus="draft"
        />,
      );

      expect(lastFrame()).toContain("✗ A.1");
      expect(lastFrame()).toContain("Dependencies");
    });

    it("shows red ✗ when blocked", () => {
      const { lastFrame } = render(
        <RelationshipList
          blocks={[]}
          blockedBy={["A.1"]}
          currentStatus="blocked"
        />,
      );

      expect(lastFrame()).toContain("✗ A.1");
      expect(lastFrame()).toContain("Blocked by:");
    });
  });

  describe("dependency resolution checkmark", () => {
    it("displays ✓ checkmark when dependencies are resolved", () => {
      const { lastFrame } = render(
        <RelationshipList
          blocks={[]}
          blockedBy={["A.1", "A.2"]}
          currentStatus="in_progress"
        />,
      );

      expect(lastFrame()).toContain("✓ A.1");
      expect(lastFrame()).toContain("✓ A.2");
    });

    it("displays ✗ when dependencies are not resolved", () => {
      const { lastFrame } = render(
        <RelationshipList
          blocks={[]}
          blockedBy={["A.1"]}
          currentStatus="draft"
        />,
      );

      expect(lastFrame()).toContain("✗ A.1");
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

      expect(lastFrame()).toContain("Dependencies");
      expect(lastFrame()).toContain("Blocks: A.1.2, A.1.3");
      expect(lastFrame()).toContain("✓ A.1");
    });
  });

  describe("status invariants", () => {
    it("handles undefined currentStatus gracefully", () => {
      const { lastFrame } = render(
        <RelationshipList blocks={[]} blockedBy={["A.1"]} />,
      );

      expect(lastFrame()).toContain("Dependencies");
      expect(lastFrame()).toContain("✗ A.1");
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
        // Each status should display either "Dependencies" or "Blocked by:"
        const hasValidLabel =
          lastFrame().includes("Dependencies") ||
          lastFrame().includes("Blocked by:");
        expect(hasValidLabel).toBe(true);
      }
    });
  });
});
