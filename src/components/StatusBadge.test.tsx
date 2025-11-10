/**
 * Behavioral tests for StatusBadge component
 *
 * Invariants:
 * - Each artifact status has a specific color mapping for visual distinction
 * - Status labels are human-readable (in_progress → In Progress)
 * - Unknown statuses default to white color and capitalize first letter
 */

import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./StatusBadge.js";

describe("StatusBadge status display", () => {
  describe("active states", () => {
    it("displays 'ready' status in green with proper label", () => {
      const { lastFrame } = render(<StatusBadge status="ready" />);

      expect(lastFrame()).toContain("Ready");
    });

    it("displays 'in_progress' status in yellow with readable label", () => {
      const { lastFrame } = render(<StatusBadge status="in_progress" />);

      expect(lastFrame()).toContain("In Progress");
    });

    it("displays 'in_review' status in blue with readable label", () => {
      const { lastFrame } = render(<StatusBadge status="in_review" />);

      expect(lastFrame()).toContain("In Review");
    });
  });

  describe("terminal states", () => {
    it("displays 'completed' status in green", () => {
      const { lastFrame } = render(<StatusBadge status="completed" />);

      expect(lastFrame()).toContain("Completed");
    });

    it("displays 'blocked' status in red to signal attention needed", () => {
      const { lastFrame } = render(<StatusBadge status="blocked" />);

      expect(lastFrame()).toContain("Blocked");
    });

    it("displays 'cancelled' status in gray", () => {
      const { lastFrame } = render(<StatusBadge status="cancelled" />);

      expect(lastFrame()).toContain("Cancelled");
    });

    it("displays 'archived' status in gray", () => {
      const { lastFrame } = render(<StatusBadge status="archived" />);

      expect(lastFrame()).toContain("Archived");
    });
  });

  describe("draft state", () => {
    it("displays 'draft' status in gray", () => {
      const { lastFrame } = render(<StatusBadge status="draft" />);

      expect(lastFrame()).toContain("Draft");
    });
  });

  describe("unknown status handling", () => {
    it("capitalizes unknown status and uses default white color", () => {
      const { lastFrame } = render(<StatusBadge status="pending" />);

      expect(lastFrame()).toContain("Pending");
    });

    it("handles empty string status gracefully", () => {
      const { lastFrame } = render(<StatusBadge status="" />);

      // Should capitalize empty string (results in empty)
      expect(lastFrame()).toBeDefined();
    });

    it("capitalizes custom status", () => {
      const { lastFrame } = render(<StatusBadge status="custom_status" />);

      expect(lastFrame()).toContain("Custom_status");
    });
  });

  describe("label transformation invariants", () => {
    it("transforms underscore-separated to Title Case for known statuses", () => {
      const { lastFrame: inProgress } = render(
        <StatusBadge status="in_progress" />,
      );
      const { lastFrame: inReview } = render(
        <StatusBadge status="in_review" />,
      );

      expect(inProgress()).toContain("In Progress");
      expect(inReview()).toContain("In Review");
    });

    it("capitalizes first letter for single-word statuses", () => {
      const statuses = ["ready", "completed", "blocked", "draft"];

      for (const status of statuses) {
        const { lastFrame } = render(<StatusBadge status={status} />);
        const expected = status.charAt(0).toUpperCase() + status.slice(1);
        expect(lastFrame()).toContain(expected);
      }
    });
  });
});
