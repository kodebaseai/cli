/**
 * Tests for performance monitoring utilities
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { PerformanceError } from "../types/errors.js";
import {
  measurePerformance,
  measurePerformanceSync,
  type PerformanceMetrics,
  PerformanceTimer,
} from "./performance.js";

// Helper to mock performance.now
const mockPerformanceNow = (startTime: number, endTime: number) => {
  let callCount = 0;
  return vi.spyOn(performance, "now").mockImplementation(() => {
    callCount++;
    return callCount === 1 ? startTime : endTime;
  });
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PerformanceTimer", () => {
  describe("complete()", () => {
    it("should measure elapsed time accurately", () => {
      const mock = mockPerformanceNow(0, 25);
      const timer = new PerformanceTimer("test-operation");

      const metrics = timer.complete();

      expect(metrics.operation).toBe("test-operation");
      expect(metrics.duration).toBe(25);
      expect(metrics.endTime).toBeGreaterThan(metrics.startTime);
      expect(metrics.exceedsThreshold).toBe(false);

      mock.mockRestore();
    });

    it("should mark as exceeds threshold when duration > 100ms", () => {
      const mock = mockPerformanceNow(0, 150);
      const timer = new PerformanceTimer("slow-operation");

      const metrics = timer.complete();

      expect(metrics.duration).toBe(150);
      expect(metrics.exceedsThreshold).toBe(true);

      mock.mockRestore();
    });

    it("should return metrics with correct structure", () => {
      const timer = new PerformanceTimer("test");
      const metrics = timer.complete();

      expect(metrics).toHaveProperty("operation");
      expect(metrics).toHaveProperty("duration");
      expect(metrics).toHaveProperty("startTime");
      expect(metrics).toHaveProperty("endTime");
      expect(metrics).toHaveProperty("exceedsThreshold");
    });

    it("should handle threshold boundary cases", () => {
      // Exactly at threshold
      const mockExact = mockPerformanceNow(0, 100);
      const timer1 = new PerformanceTimer("exact");
      const metrics1 = timer1.complete();
      expect(metrics1.exceedsThreshold).toBe(false);
      mockExact.mockRestore();

      // Just over threshold
      const mockOver = mockPerformanceNow(0, 100.1);
      const timer2 = new PerformanceTimer("over");
      const metrics2 = timer2.complete();
      expect(metrics2.exceedsThreshold).toBe(true);
      mockOver.mockRestore();
    });
  });

  describe("completeWithCheck()", () => {
    it("should return metrics when duration is under threshold", () => {
      const mock = mockPerformanceNow(0, 50);
      const timer = new PerformanceTimer("fast-operation");

      const metrics = timer.completeWithCheck();

      expect(metrics.exceedsThreshold).toBe(false);
      expect(metrics.duration).toBe(50);

      mock.mockRestore();
    });

    it("should throw PerformanceError when duration exceeds threshold", () => {
      const mock = mockPerformanceNow(0, 200);
      const timer = new PerformanceTimer("slow-operation");

      expect(() => timer.completeWithCheck()).toThrow(PerformanceError);
      expect(() => timer.completeWithCheck()).toThrow(
        'Operation "slow-operation" took 200ms (exceeded 100ms limit)',
      );

      mock.mockRestore();
    });

    it("should throw error with exit code 0 for performance warnings", () => {
      const mock = mockPerformanceNow(0, 150);
      const timer = new PerformanceTimer("slow-operation");

      try {
        timer.completeWithCheck();
        expect.fail("Should have thrown PerformanceError");
      } catch (error) {
        if (error instanceof PerformanceError) {
          expect(error.exitCode).toBe(0);
        } else {
          throw error;
        }
      }

      mock.mockRestore();
    });
  });
});

describe("measurePerformance", () => {
  it("should measure async operation and return result with metrics", async () => {
    const mock = mockPerformanceNow(0, 15);
    const asyncFn = async () => "test-result";

    const { result, metrics } = await measurePerformance("async-test", asyncFn);

    expect(result).toBe("test-result");
    expect(metrics.operation).toBe("async-test");
    expect(metrics.duration).toBe(15);
    expect(metrics.exceedsThreshold).toBe(false);

    mock.mockRestore();
  });

  it("should handle fast operations correctly", async () => {
    const fastFn = async () => "immediate";

    const { result, metrics } = await measurePerformance("fast-async", fastFn);

    expect(result).toBe("immediate");
    expect(metrics.duration).toBeLessThan(100);
    expect(metrics.exceedsThreshold).toBe(false);
  });

  it("should detect slow operations", async () => {
    const mock = mockPerformanceNow(0, 150);
    const slowFn = async () => "slow-result";

    const { result, metrics } = await measurePerformance("slow-async", slowFn);

    expect(result).toBe("slow-result");
    expect(metrics.duration).toBe(150);
    expect(metrics.exceedsThreshold).toBe(true);

    mock.mockRestore();
  });

  it("should attach performance info to errors", async () => {
    const errorFn = async () => {
      throw new Error("Operation failed");
    };

    await expect(measurePerformance("error-test", errorFn)).rejects.toThrow(
      /Operation failed \(took \d+ms\)/,
    );
  });

  it("should preserve original error and add timing info", async () => {
    const customError = new Error("Custom error message");
    const errorFn = async () => {
      throw customError;
    };

    try {
      await measurePerformance("custom-error", errorFn);
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBe(customError);
      expect((error as Error).message).toMatch(
        /Custom error message \(took \d+ms\)/,
      );
    }
  });

  it("should handle promise rejections", async () => {
    const rejectFn = async () => Promise.reject(new Error("Rejected"));

    await expect(measurePerformance("reject-test", rejectFn)).rejects.toThrow(
      /Rejected \(took \d+ms\)/,
    );
  });
});

describe("measurePerformanceSync", () => {
  it("should measure sync operation and return result with metrics", () => {
    const syncFn = () => {
      const result = 2 + 2;
      return result;
    };

    const { result, metrics } = measurePerformanceSync("sync-test", syncFn);

    expect(result).toBe(4);
    expect(metrics.operation).toBe("sync-test");
    expect(metrics.duration).toBeLessThan(100);
    expect(metrics.exceedsThreshold).toBe(false);
  });

  it("should handle fast sync operations", () => {
    const fastFn = () => "immediate";

    const { result, metrics } = measurePerformanceSync("fast-sync", fastFn);

    expect(result).toBe("immediate");
    expect(metrics.duration).toBeLessThan(10);
    expect(metrics.exceedsThreshold).toBe(false);
  });

  it("should detect slow sync operations with mock", () => {
    const mock = mockPerformanceNow(0, 150);
    const slowFn = () => "done";

    const { result, metrics } = measurePerformanceSync("slow-sync", slowFn);

    expect(result).toBe("done");
    expect(metrics.duration).toBe(150);
    expect(metrics.exceedsThreshold).toBe(true);

    mock.mockRestore();
  });

  it("should attach performance info to sync errors", () => {
    const errorFn = () => {
      throw new Error("Sync operation failed");
    };

    expect(() => measurePerformanceSync("sync-error", errorFn)).toThrow(
      /Sync operation failed \(took \d+ms\)/,
    );
  });

  it("should preserve original error type", () => {
    const customError = new TypeError("Type error");
    const errorFn = () => {
      throw customError;
    };

    try {
      measurePerformanceSync("type-error", errorFn);
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBe(customError);
      expect(error).toBeInstanceOf(TypeError);
      expect((error as Error).message).toMatch(/Type error \(took \d+ms\)/);
    }
  });

  it("should handle complex return types", () => {
    const complexFn = () => ({
      data: [1, 2, 3],
      status: "success",
      nested: { value: 42 },
    });

    const { result, metrics } = measurePerformanceSync("complex", complexFn);

    expect(result).toEqual({
      data: [1, 2, 3],
      status: "success",
      nested: { value: 42 },
    });
    expect(metrics.operation).toBe("complex");
  });
});

describe("Performance metrics structure", () => {
  it("should have consistent metrics across different operations", () => {
    const timer = new PerformanceTimer("consistency-test");
    const metrics = timer.complete();

    const validateMetrics = (m: PerformanceMetrics) => {
      expect(typeof m.operation).toBe("string");
      expect(typeof m.duration).toBe("number");
      expect(typeof m.startTime).toBe("number");
      expect(typeof m.endTime).toBe("number");
      expect(typeof m.exceedsThreshold).toBe("boolean");
      expect(m.duration).toBe(m.endTime - m.startTime);
    };

    validateMetrics(metrics);
  });

  it("should have readonly metrics properties", () => {
    const timer = new PerformanceTimer("readonly-test");
    const metrics = timer.complete();

    // TypeScript should enforce readonly, but we can verify the structure
    expect(Object.isFrozen(metrics)).toBe(false); // Not frozen, but typed as readonly
    expect(metrics).toHaveProperty("operation");
    expect(metrics).toHaveProperty("duration");
  });
});

describe("Edge cases", () => {
  it("should handle operations with special characters in names", () => {
    const timer = new PerformanceTimer("test/operation:with-special@chars");
    const metrics = timer.complete();

    expect(metrics.operation).toBe("test/operation:with-special@chars");
  });

  it("should handle very fast operations (< 1ms)", async () => {
    const veryFastFn = async () => 1 + 1;

    const { result, metrics } = await measurePerformance(
      "very-fast",
      veryFastFn,
    );

    expect(result).toBe(2);
    expect(metrics.duration).toBeGreaterThanOrEqual(0);
    expect(metrics.exceedsThreshold).toBe(false);
  });

  it("should handle empty operation names", () => {
    const timer = new PerformanceTimer("");
    const metrics = timer.complete();

    expect(metrics.operation).toBe("");
    expect(metrics.duration).toBeGreaterThanOrEqual(0);
  });

  it("should measure multiple operations independently", () => {
    const timer1 = new PerformanceTimer("op1");
    const timer2 = new PerformanceTimer("op2");

    const metrics1 = timer1.complete();
    const metrics2 = timer2.complete();

    expect(metrics1.operation).toBe("op1");
    expect(metrics2.operation).toBe("op2");
    // Start times should be different (unless executed at exact same millisecond)
    // We just verify they're both valid numbers
    expect(typeof metrics1.startTime).toBe("number");
    expect(typeof metrics2.startTime).toBe("number");
  });

  it("should handle zero duration edge case", () => {
    const mock = mockPerformanceNow(100, 100); // Same start and end time
    const timer = new PerformanceTimer("instant");
    const metrics = timer.complete();

    expect(metrics.duration).toBe(0);
    expect(metrics.exceedsThreshold).toBe(false);

    mock.mockRestore();
  });
});

// Note: usePerformanceTracking hook is tested in integration tests with actual React components
// Unit testing React hooks with ESM modules has limitations with spying on exported functions
