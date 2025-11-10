/**
 * Test setup file for CLI package
 * Configures fake timers and deterministic RNG
 */

import { vi } from "vitest";

beforeEach(() => {
  // Use fake timers for deterministic test execution
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));

  // Mock Math.random for deterministic random behavior
  vi.spyOn(Math, "random").mockReturnValue(0.123456789);
});

afterEach(() => {
  // Restore real timers after each test
  vi.useRealTimers();
  vi.restoreAllMocks();
});
