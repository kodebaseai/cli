/**
 * Behavioral tests for EventTimeline component
 *
 * Invariants:
 * - Events are sorted by timestamp (newest first)
 * - Only maxEvents are displayed (default: 5)
 * - Timestamps are formatted relative to current time
 * - Each event type has a specific icon and color
 * - Empty event list shows "No events" message
 */

import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { EventTimeline } from "./EventTimeline.js";

describe("EventTimeline event display", () => {
  describe("empty state", () => {
    it("displays 'No events' message when events array is empty", () => {
      const { lastFrame } = render(<EventTimeline events={[]} />);

      expect(lastFrame()).toContain("No events");
    });
  });

  describe("event rendering", () => {
    it("displays events with timestamps and actors", () => {
      const events = [
        {
          timestamp: new Date().toISOString(),
          event: "ready",
          actor: "Miguel Carvalho",
          trigger: "dependencies_met",
        },
      ];

      const { lastFrame } = render(<EventTimeline events={events} />);

      expect(lastFrame()).toContain("Event History:");
      expect(lastFrame()).toContain("ready");
      expect(lastFrame()).toContain("Miguel Carvalho");
      expect(lastFrame()).not.toContain("dependencies_met");
    });

    it("displays events without trigger when trigger is not provided", () => {
      const events = [
        {
          timestamp: new Date().toISOString(),
          event: "draft",
          actor: "Miguel Carvalho",
        },
      ];

      const { lastFrame } = render(<EventTimeline events={events} />);

      expect(lastFrame()).toContain("draft");
      expect(lastFrame()).toContain("Miguel Carvalho");
    });
  });

  describe("event ordering", () => {
    it("sorts events by timestamp (newest first)", () => {
      const now = Date.now();
      const events = [
        {
          timestamp: new Date(now - 3600000).toISOString(), // 1 hour ago
          event: "draft",
          actor: "User A",
        },
        {
          timestamp: new Date(now - 1800000).toISOString(), // 30 mins ago
          event: "ready",
          actor: "User B",
        },
        {
          timestamp: new Date(now - 7200000).toISOString(), // 2 hours ago
          event: "in_progress",
          actor: "User C",
        },
      ];

      const { lastFrame } = render(<EventTimeline events={events} />);
      const frame = lastFrame() || "";

      // "ready" (30 mins ago) should appear before "draft" (1 hour ago)
      const readyIndex = frame.indexOf("ready");
      const draftIndex = frame.indexOf("draft");

      expect(readyIndex).toBeLessThan(draftIndex);
    });
  });

  describe("maxEvents limiting", () => {
    it("limits displayed events to maxEvents (default 5)", () => {
      const events = Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
        event: `event_${i}`,
        actor: `User ${i}`,
      }));

      const { lastFrame } = render(<EventTimeline events={events} />);
      const frame = lastFrame() || "";

      // Should only show first 5 events
      expect(frame).toContain("event_0");
      expect(frame).toContain("event_4");
      expect(frame).not.toContain("event_5");
    });

    it("respects custom maxEvents prop", () => {
      const events = Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
        event: `event_${i}`,
        actor: `User ${i}`,
      }));

      const { lastFrame } = render(
        <EventTimeline events={events} maxEvents={3} />,
      );
      const frame = lastFrame() || "";

      // Should only show first 3 events
      expect(frame).toContain("event_0");
      expect(frame).toContain("event_2");
      expect(frame).not.toContain("event_3");
    });
  });

  describe("timestamp formatting", () => {
    it('formats recent events as "Just now"', () => {
      const currentTime = new Date("2025-01-01T12:00:00Z");
      const events = [
        {
          timestamp: new Date("2025-01-01T12:00:00Z").toISOString(),
          event: "ready",
          actor: "Miguel Carvalho",
        },
      ];

      const { lastFrame } = render(
        <EventTimeline events={events} currentTime={currentTime} />,
      );

      expect(lastFrame()).toContain("Just now");
    });

    it('formats events within 24 hours as "Xh ago"', () => {
      const currentTime = new Date("2025-01-01T12:00:00Z");
      const twoHoursAgo = new Date("2025-01-01T10:00:00Z").toISOString();
      const events = [
        {
          timestamp: twoHoursAgo,
          event: "in_progress",
          actor: "Miguel Carvalho",
        },
      ];

      const { lastFrame } = render(
        <EventTimeline events={events} currentTime={currentTime} />,
      );

      expect(lastFrame()).toContain("2h ago");
    });

    it('formats events older than 24 hours as "Xd ago"', () => {
      const currentTime = new Date("2025-01-03T12:00:00Z");
      const twoDaysAgo = new Date("2025-01-01T12:00:00Z").toISOString();
      const events = [
        {
          timestamp: twoDaysAgo,
          event: "completed",
          actor: "Miguel Carvalho",
        },
      ];

      const { lastFrame } = render(
        <EventTimeline events={events} currentTime={currentTime} />,
      );

      expect(lastFrame()).toContain("2d ago");
    });
  });

  describe("event icons", () => {
    it("displays ○ icon for ready events", () => {
      const events = [
        {
          timestamp: new Date().toISOString(),
          event: "ready",
          actor: "User",
        },
      ];

      const { lastFrame } = render(<EventTimeline events={events} />);

      expect(lastFrame()).toContain("○");
    });

    it("displays ◎ icon for in_progress events", () => {
      const events = [
        {
          timestamp: new Date().toISOString(),
          event: "in_progress",
          actor: "User",
        },
      ];

      const { lastFrame } = render(<EventTimeline events={events} />);

      expect(lastFrame()).toContain("◎");
    });

    it("displays ◇ icon for blocked events", () => {
      const events = [
        {
          timestamp: new Date().toISOString(),
          event: "blocked",
          actor: "User",
        },
      ];

      const { lastFrame } = render(<EventTimeline events={events} />);

      expect(lastFrame()).toContain("◇");
    });

    it("displays ◌ icon for draft and artifact_created events", () => {
      const events = [
        {
          timestamp: new Date().toISOString(),
          event: "draft",
          actor: "User",
        },
      ];

      const { lastFrame } = render(<EventTimeline events={events} />);

      expect(lastFrame()).toContain("◌");
    });
  });

  describe("event status invariants", () => {
    it("displays all standard event types correctly", () => {
      const eventTypes = [
        "draft",
        "ready",
        "in_progress",
        "in_review",
        "completed",
        "blocked",
        "cancelled",
        "archived",
        "branch_created",
        "pr_ready",
        "pr_merged",
      ];

      for (const eventType of eventTypes) {
        const events = [
          {
            timestamp: new Date().toISOString(),
            event: eventType,
            actor: "Test User",
          },
        ];

        const { lastFrame } = render(<EventTimeline events={events} />);

        expect(lastFrame()).toContain(eventType);
      }
    });
  });
});
