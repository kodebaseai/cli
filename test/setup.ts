/**
 * Test setup file for CLI package
 * Configures fake timers and deterministic RNG
 */

import { vi } from "vitest";

// Fix for Node 24 console.Console constructor issue with patch-console
// This mock prevents Ink from trying to patch the console in tests
if (typeof globalThis.console.Console === "undefined") {
  // @ts-expect-error - Mocking console.Console for Node 24 compatibility
  globalThis.console.Console = class MockConsole {};
}

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
