/**
 * Tests for CLI error types
 */

import { describe, expect, it, vi } from "vitest";
import {
  CLIError,
  type CLIErrorOptions,
  type ErrorSuggestion,
  FileSystemError,
  GitError,
  InvalidArtifactIdError,
  PerformanceError,
  ValidationError,
} from "./errors.js";

describe("CLIError", () => {
  // Create a concrete implementation for testing abstract class
  class TestCLIError extends CLIError {}

  it("should create error with default values", () => {
    const error = new TestCLIError("Test error");

    expect(error.message).toBe("Test error");
    expect(error.name).toBe("TestCLIError");
    expect(error.suggestions).toEqual([]);
    expect(error.exitCode).toBe(1);
    expect(error.showStackTrace).toBe(false);
    expect(error.cause).toBeUndefined();
  });

  it("should create error with custom options", () => {
    const cause = new Error("Original error");
    const suggestions: ErrorSuggestion[] = [
      {
        action: "Try this",
        command: "some command",
        description: "This might help",
      },
    ];
    const options: CLIErrorOptions = {
      cause,
      suggestions,
      exitCode: 2,
      showStackTrace: true,
    };

    const error = new TestCLIError("Test error", options);

    expect(error.message).toBe("Test error");
    expect(error.suggestions).toEqual(suggestions);
    expect(error.exitCode).toBe(2);
    expect(error.showStackTrace).toBe(true);
    expect(error.cause).toBe(cause);
  });

  it("should have proper stack trace", () => {
    const error = new TestCLIError("Test error");

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain("TestCLIError");
  });

  it("should capture stack trace correctly", () => {
    const captureStackTrace = vi.spyOn(Error, "captureStackTrace");
    const error = new TestCLIError("Test error");

    expect(captureStackTrace).toHaveBeenCalledWith(error, TestCLIError);

    captureStackTrace.mockRestore();
  });

  it("should extend Error correctly", () => {
    const error = new TestCLIError("Test error");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(CLIError);
  });

  it("should handle empty suggestions array", () => {
    const error = new TestCLIError("Test error", { suggestions: [] });

    expect(error.suggestions).toEqual([]);
  });

  it("should handle multiple suggestions", () => {
    const suggestions: ErrorSuggestion[] = [
      { action: "First", description: "First action" },
      { action: "Second", command: "cmd", description: "Second action" },
      { action: "Third", description: "Third action" },
    ];

    const error = new TestCLIError("Test error", { suggestions });

    expect(error.suggestions).toHaveLength(3);
    expect(error.suggestions).toEqual(suggestions);
  });
});

describe("FileSystemError", () => {
  it("should create error with file path context", () => {
    const error = new FileSystemError("File not found", "/path/to/file.txt");

    expect(error.message).toBe("File not found");
    expect(error.suggestions).toHaveLength(2); // Default suggestions
    expect(error.suggestions[0].action).toBe("Check if the file exists");
    expect(error.suggestions[0].command).toContain("/path/to/file.txt");
    expect(error.suggestions[1].action).toBe("Check current directory");
  });

  it("should include custom suggestions in addition to defaults", () => {
    const customSuggestions: ErrorSuggestion[] = [
      { action: "Custom action", description: "Custom description" },
    ];

    const error = new FileSystemError(
      "Permission denied",
      "/path/to/file.txt",
      { suggestions: customSuggestions },
    );

    expect(error.suggestions).toHaveLength(3); // 2 default + 1 custom
    expect(error.suggestions[2].action).toBe("Custom action");
  });

  it("should pass through other options", () => {
    const cause = new Error("ENOENT");
    const error = new FileSystemError("File not found", "/path/to/file.txt", {
      cause,
      exitCode: 2,
      showStackTrace: true,
    });

    expect(error.cause).toBe(cause);
    expect(error.exitCode).toBe(2);
    expect(error.showStackTrace).toBe(true);
  });

  it("should handle file paths with quotes", () => {
    const error = new FileSystemError(
      "File not found",
      '/path/with "quotes"/file.txt',
    );

    expect(error.suggestions[0].command).toContain(
      'ls -la "/path/with "quotes"/file.txt"',
    );
  });

  it("should extend CLIError", () => {
    const error = new FileSystemError("Error", "/path");

    expect(error).toBeInstanceOf(CLIError);
    expect(error).toBeInstanceOf(FileSystemError);
  });
});

describe("InvalidArtifactIdError", () => {
  it("should create error with artifact ID context", () => {
    const error = new InvalidArtifactIdError("INVALID-123");

    expect(error.message).toBe('Invalid artifact ID: "INVALID-123"');
    expect(error.suggestions).toHaveLength(2); // Default suggestions
    expect(error.suggestions[0].action).toBe("List available artifacts");
    expect(error.suggestions[0].command).toBe("kodebase list");
    expect(error.suggestions[1].action).toBe("Check ID format");
  });

  it("should include custom suggestions in addition to defaults", () => {
    const customSuggestions: ErrorSuggestion[] = [
      { action: "Custom action", description: "Custom description" },
    ];

    const error = new InvalidArtifactIdError("INVALID", {
      suggestions: customSuggestions,
    });

    expect(error.suggestions).toHaveLength(3); // 2 default + 1 custom
    expect(error.suggestions[2].action).toBe("Custom action");
  });

  it("should pass through other options", () => {
    const cause = new Error("Parse error");
    const error = new InvalidArtifactIdError("INVALID", {
      cause,
      exitCode: 3,
      showStackTrace: true,
    });

    expect(error.cause).toBe(cause);
    expect(error.exitCode).toBe(3);
    expect(error.showStackTrace).toBe(true);
  });

  it("should extend CLIError", () => {
    const error = new InvalidArtifactIdError("INVALID");

    expect(error).toBeInstanceOf(CLIError);
    expect(error).toBeInstanceOf(InvalidArtifactIdError);
  });
});

describe("ValidationError", () => {
  it("should create error with validation context", () => {
    const error = new ValidationError(
      "title",
      "abc",
      "Title must be at least 5 characters",
    );

    expect(error.message).toBe(
      'Invalid title: "abc". Title must be at least 5 characters',
    );
    expect(error.suggestions).toEqual([]); // No default suggestions
  });

  it("should handle custom suggestions", () => {
    const suggestions: ErrorSuggestion[] = [
      {
        action: "Check documentation",
        description: "See validation rules",
      },
    ];

    const error = new ValidationError(
      "priority",
      "urgent",
      "Must be one of: low, medium, high, critical",
      { suggestions },
    );

    expect(error.suggestions).toEqual(suggestions);
  });

  it("should pass through other options", () => {
    const error = new ValidationError("field", "value", "requirements", {
      exitCode: 2,
      showStackTrace: true,
    });

    expect(error.exitCode).toBe(2);
    expect(error.showStackTrace).toBe(true);
  });

  it("should extend CLIError", () => {
    const error = new ValidationError("field", "value", "requirements");

    expect(error).toBeInstanceOf(CLIError);
    expect(error).toBeInstanceOf(ValidationError);
  });

  it("should handle different field types", () => {
    const error1 = new ValidationError(
      "email",
      "invalid",
      "Must be a valid email",
    );
    const error2 = new ValidationError(
      "age",
      "-5",
      "Must be a positive number",
    );

    expect(error1.message).toContain("Invalid email");
    expect(error2.message).toContain("Invalid age");
  });
});

describe("GitError", () => {
  it("should create error with git operation context", () => {
    const error = new GitError("commit", "Nothing to commit");

    expect(error.message).toBe("Git commit failed: Nothing to commit");
    expect(error.suggestions).toHaveLength(2); // Default suggestions
    expect(error.suggestions[0].action).toBe("Check git status");
    expect(error.suggestions[0].command).toBe("git status");
    expect(error.suggestions[1].action).toBe(
      "Ensure you are in a git repository",
    );
  });

  it("should handle different git operations", () => {
    const pushError = new GitError("push", "Remote rejected");
    const pullError = new GitError("pull", "Merge conflict");
    const cloneError = new GitError("clone", "Repository not found");

    expect(pushError.message).toBe("Git push failed: Remote rejected");
    expect(pullError.message).toBe("Git pull failed: Merge conflict");
    expect(cloneError.message).toBe("Git clone failed: Repository not found");
  });

  it("should include custom suggestions in addition to defaults", () => {
    const customSuggestions: ErrorSuggestion[] = [
      {
        action: "Check credentials",
        description: "Verify your git credentials",
      },
    ];

    const error = new GitError("push", "Authentication failed", {
      suggestions: customSuggestions,
    });

    expect(error.suggestions).toHaveLength(3); // 2 default + 1 custom
    expect(error.suggestions[2].action).toBe("Check credentials");
  });

  it("should pass through other options", () => {
    const cause = new Error("Network error");
    const error = new GitError("fetch", "Failed to fetch", {
      cause,
      exitCode: 128,
      showStackTrace: true,
    });

    expect(error.cause).toBe(cause);
    expect(error.exitCode).toBe(128);
    expect(error.showStackTrace).toBe(true);
  });

  it("should extend CLIError", () => {
    const error = new GitError("status", "Failed");

    expect(error).toBeInstanceOf(CLIError);
    expect(error).toBeInstanceOf(GitError);
  });
});

describe("PerformanceError", () => {
  it("should create error with performance context", () => {
    const error = new PerformanceError("loadArtifacts", 250);

    expect(error.message).toBe(
      'Operation "loadArtifacts" took 250ms (exceeded 100ms limit)',
    );
    expect(error.suggestions).toHaveLength(2); // Default suggestions
    expect(error.suggestions[0].action).toBe("Check file system performance");
    expect(error.suggestions[1].action).toBe("Report performance issue");
    expect(error.exitCode).toBe(0); // Performance warnings don't exit
  });

  it("should handle different operations and durations", () => {
    const error1 = new PerformanceError("parseYAML", 150);
    const error2 = new PerformanceError("validateHierarchy", 500);

    expect(error1.message).toContain("parseYAML");
    expect(error1.message).toContain("150ms");
    expect(error2.message).toContain("validateHierarchy");
    expect(error2.message).toContain("500ms");
  });

  it("should always use exit code 0", () => {
    const error = new PerformanceError("slowOp", 200, { exitCode: 1 });

    // Exit code should be overridden to 0
    expect(error.exitCode).toBe(0);
  });

  it("should include custom suggestions in addition to defaults", () => {
    const customSuggestions: ErrorSuggestion[] = [
      {
        action: "Optimize codebase",
        description: "Consider optimizing the operation",
      },
    ];

    const error = new PerformanceError("slowOp", 300, {
      suggestions: customSuggestions,
    });

    expect(error.suggestions).toHaveLength(3); // 2 default + 1 custom
    expect(error.suggestions[2].action).toBe("Optimize codebase");
  });

  it("should pass through showStackTrace option", () => {
    const error = new PerformanceError("slowOp", 200, {
      showStackTrace: true,
    });

    expect(error.showStackTrace).toBe(true);
  });

  it("should extend CLIError", () => {
    const error = new PerformanceError("operation", 200);

    expect(error).toBeInstanceOf(CLIError);
    expect(error).toBeInstanceOf(PerformanceError);
  });

  it("should handle large duration numbers", () => {
    const error = new PerformanceError("verySlowOp", 999999);

    expect(error.message).toContain("999999ms");
  });
});
