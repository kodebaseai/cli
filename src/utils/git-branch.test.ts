/**
 * Tests for git-branch utilities
 */

import type { ExecException } from "node:child_process";
import * as childProcess from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkGHCLI,
  createArtifactBranch,
  getGitStatus,
  validateGitStatus,
} from "./git-branch.js";

// Type for mocked exec output
interface MockExecOutput {
  stdout: string;
  stderr: string;
}

// Mock child_process exec
vi.mock("node:child_process", () => ({
  exec: vi.fn(),
}));

// Mock settings
vi.mock("./settings.js", () => ({
  loadSettings: vi.fn(() =>
    Promise.resolve({
      gitOps: {
        branches: {
          mainBranch: "main",
        },
      },
    }),
  ),
}));

describe("git-branch utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.log during tests
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getGitStatus", () => {
    it("should return git status for clean main branch", async () => {
      const mockExec = vi.mocked(childProcess.exec);
      mockExec
        .mockImplementationOnce((_cmd, callback) => {
          // git rev-parse --abbrev-ref HEAD
          const output: MockExecOutput = { stdout: "main\n", stderr: "" };
          callback?.(null, output, "");
          return undefined as unknown as childProcess.ChildProcess;
        })
        .mockImplementationOnce((_cmd, callback) => {
          // git status --porcelain
          const output: MockExecOutput = { stdout: "", stderr: "" };
          callback?.(null, output, "");
          return undefined as unknown as childProcess.ChildProcess;
        });

      const status = await getGitStatus();

      expect(status).toEqual({
        branch: "main",
        isClean: true,
        isOnMainBranch: true,
        changes: undefined,
      });
    });

    it("should return git status for dirty working directory", async () => {
      const mockExec = vi.mocked(childProcess.exec);
      mockExec
        .mockImplementationOnce((_cmd, callback) => {
          const output: MockExecOutput = { stdout: "main\n", stderr: "" };
          callback?.(null, output, "");
          return undefined as unknown as childProcess.ChildProcess;
        })
        .mockImplementationOnce((_cmd, callback) => {
          const output: MockExecOutput = {
            stdout: "?? .kodebase/artifacts/F/\nM README.md\n",
            stderr: "",
          };
          callback?.(null, output, "");
          return undefined as unknown as childProcess.ChildProcess;
        });

      const status = await getGitStatus();

      expect(status).toEqual({
        branch: "main",
        isClean: false,
        isOnMainBranch: true,
        changes: ["?? .kodebase/artifacts/F/", "M README.md"],
      });
    });

    it("should detect add/* branch", async () => {
      const mockExec = vi.mocked(childProcess.exec);
      mockExec
        .mockImplementationOnce((_cmd, callback) => {
          const output: MockExecOutput = { stdout: "add/f\n", stderr: "" };
          callback?.(null, output, "");
          return undefined as unknown as childProcess.ChildProcess;
        })
        .mockImplementationOnce((_cmd, callback) => {
          const output: MockExecOutput = { stdout: "M file.txt\n", stderr: "" };
          callback?.(null, output, "");
          return undefined as unknown as childProcess.ChildProcess;
        });

      const status = await getGitStatus();

      expect(status.branch).toBe("add/f");
      expect(status.isOnMainBranch).toBe(false);
    });

    it("should throw error when not in a git repository", async () => {
      const mockExec = vi.mocked(childProcess.exec);
      mockExec.mockImplementationOnce((_cmd, callback) => {
        const error = new Error("not a git repository") as ExecException;
        const output: MockExecOutput = { stdout: "", stderr: "" };
        callback?.(error, output, "");
        return undefined as unknown as childProcess.ChildProcess;
      });

      await expect(getGitStatus()).rejects.toThrow("Not in a git repository");
    });
  });

  describe("validateGitStatus", () => {
    it("should pass validation on clean main branch", async () => {
      const mockExec = vi.mocked(childProcess.exec);
      mockExec
        .mockImplementationOnce((_cmd, callback) => {
          const output: MockExecOutput = { stdout: "main\n", stderr: "" };
          callback?.(null, output, "");
          return undefined as unknown as childProcess.ChildProcess;
        })
        .mockImplementationOnce((_cmd, callback) => {
          const output: MockExecOutput = { stdout: "", stderr: "" };
          callback?.(null, output, "");
          return undefined as unknown as childProcess.ChildProcess;
        });

      const error = await validateGitStatus();

      expect(error).toBeUndefined();
    });

    it("should skip validation when on add/* branch", async () => {
      const mockExec = vi.mocked(childProcess.exec);
      mockExec
        .mockImplementationOnce((_cmd, callback) => {
          const output: MockExecOutput = { stdout: "add/f\n", stderr: "" };
          callback?.(null, output, "");
          return undefined as unknown as childProcess.ChildProcess;
        })
        .mockImplementationOnce((_cmd, callback) => {
          // Even with uncommitted changes, should pass
          const output: MockExecOutput = { stdout: "M file.txt\n", stderr: "" };
          callback?.(null, output, "");
          return undefined as unknown as childProcess.ChildProcess;
        });

      const error = await validateGitStatus();

      expect(error).toBeUndefined();
    });

    it("should fail validation with dirty working directory on main", async () => {
      const mockExec = vi.mocked(childProcess.exec);
      mockExec
        .mockImplementationOnce((_cmd, callback) => {
          const output: MockExecOutput = { stdout: "main\n", stderr: "" };
          callback?.(null, output, "");
          return undefined as unknown as childProcess.ChildProcess;
        })
        .mockImplementationOnce((_cmd, callback) => {
          const output: MockExecOutput = { stdout: "M file.txt\n", stderr: "" };
          callback?.(null, output, "");
          return undefined as unknown as childProcess.ChildProcess;
        });

      const error = await validateGitStatus();

      expect(error).toContain("Working directory is not clean");
      expect(error).toContain("M file.txt");
    });

    it("should fail validation when not on main branch", async () => {
      const mockExec = vi.mocked(childProcess.exec);
      mockExec
        .mockImplementationOnce((_cmd, callback) => {
          const output: MockExecOutput = {
            stdout: "feature-branch\n",
            stderr: "",
          };
          callback?.(null, output, "");
          return undefined as unknown as childProcess.ChildProcess;
        })
        .mockImplementationOnce((_cmd, callback) => {
          const output: MockExecOutput = { stdout: "", stderr: "" };
          callback?.(null, output, "");
          return undefined as unknown as childProcess.ChildProcess;
        });

      const error = await validateGitStatus();

      expect(error).toContain("You must be on the main branch");
      expect(error).toContain("Currently on: feature-branch");
    });
  });

  describe("createArtifactBranch", () => {
    it("should create new branch for valid artifact ID", async () => {
      const mockExec = vi.mocked(childProcess.exec);
      // Mock validation (clean main)
      mockExec
        .mockImplementationOnce((_cmd, callback) => {
          const output: MockExecOutput = { stdout: "main\n", stderr: "" };
          callback?.(null, output, "");
          return undefined as unknown as childProcess.ChildProcess;
        })
        .mockImplementationOnce((_cmd, callback) => {
          const output: MockExecOutput = { stdout: "", stderr: "" };
          callback?.(null, output, "");
          return undefined as unknown as childProcess.ChildProcess;
        })
        // Mock git branch --list (no existing branch)
        .mockImplementationOnce((_cmd, callback) => {
          const output: MockExecOutput = {
            stdout: "  main\n* main\n",
            stderr: "",
          };
          callback?.(null, output, "");
          return undefined as unknown as childProcess.ChildProcess;
        })
        // Mock git checkout -b
        .mockImplementationOnce((cmd, callback) => {
          expect(cmd).toContain("git checkout -b add/f");
          const output: MockExecOutput = { stdout: "", stderr: "" };
          callback?.(null, output, "");
          return undefined as unknown as childProcess.ChildProcess;
        });

      const result = await createArtifactBranch("F");

      expect(result.success).toBe(true);
      expect(result.branchName).toBe("add/f");
    });

    it("should checkout existing branch instead of creating new one", async () => {
      const mockExec = vi.mocked(childProcess.exec);
      // Mock validation
      mockExec
        .mockImplementationOnce((_cmd, callback) => {
          const output: MockExecOutput = { stdout: "main\n", stderr: "" };
          callback?.(null, output, "");
          return undefined as unknown as childProcess.ChildProcess;
        })
        .mockImplementationOnce((_cmd, callback) => {
          const output: MockExecOutput = { stdout: "", stderr: "" };
          callback?.(null, output, "");
          return undefined as unknown as childProcess.ChildProcess;
        })
        // Mock git branch --list (branch exists)
        .mockImplementationOnce((_cmd, callback) => {
          const output: MockExecOutput = {
            stdout: "  main\n  add/f\n* main\n",
            stderr: "",
          };
          callback?.(null, output, "");
          return undefined as unknown as childProcess.ChildProcess;
        })
        // Mock git checkout (not -b)
        .mockImplementationOnce((cmd, callback) => {
          expect(cmd).toBe("git checkout add/f");
          const output: MockExecOutput = { stdout: "", stderr: "" };
          callback?.(null, output, "");
          return undefined as unknown as childProcess.ChildProcess;
        });

      const result = await createArtifactBranch("F");

      expect(result.success).toBe(true);
      expect(result.branchName).toBe("add/f");
    });

    it("should use lowercase for branch names", async () => {
      const mockExec = vi.mocked(childProcess.exec);
      // Mock validation
      mockExec
        .mockImplementationOnce((_cmd, callback) => {
          const output: MockExecOutput = { stdout: "main\n", stderr: "" };
          callback?.(null, output, "");
          return undefined as unknown as childProcess.ChildProcess;
        })
        .mockImplementationOnce((_cmd, callback) => {
          const output: MockExecOutput = { stdout: "", stderr: "" };
          callback?.(null, output, "");
          return undefined as unknown as childProcess.ChildProcess;
        })
        // Mock git branch --list
        .mockImplementationOnce((_cmd, callback) => {
          const output: MockExecOutput = { stdout: "  main\n", stderr: "" };
          callback?.(null, output, "");
          return undefined as unknown as childProcess.ChildProcess;
        })
        // Mock git checkout -b
        .mockImplementationOnce((cmd, callback) => {
          expect(cmd).toContain("add/abc");
          const output: MockExecOutput = { stdout: "", stderr: "" };
          callback?.(null, output, "");
          return undefined as unknown as childProcess.ChildProcess;
        });

      const result = await createArtifactBranch("ABC");

      expect(result.branchName).toBe("add/abc");
    });

    it("should return error when validation fails", async () => {
      const mockExec = vi.mocked(childProcess.exec);
      // Mock validation (not on main)
      mockExec
        .mockImplementationOnce((_cmd, callback) => {
          const output: MockExecOutput = { stdout: "feature\n", stderr: "" };
          callback?.(null, output, "");
          return undefined as unknown as childProcess.ChildProcess;
        })
        .mockImplementationOnce((_cmd, callback) => {
          const output: MockExecOutput = { stdout: "", stderr: "" };
          callback?.(null, output, "");
          return undefined as unknown as childProcess.ChildProcess;
        });

      const result = await createArtifactBranch("F");

      expect(result.success).toBe(false);
      expect(result.error).toContain("You must be on the main branch");
    });
  });

  describe("checkGHCLI", () => {
    it("should return true when gh CLI is authenticated", async () => {
      const mockExec = vi.mocked(childProcess.exec);
      mockExec.mockImplementationOnce((cmd, callback) => {
        expect(cmd).toBe("gh auth status");
        const output: MockExecOutput = { stdout: "Logged in", stderr: "" };
        callback?.(null, output, "");
        return undefined as unknown as childProcess.ChildProcess;
      });

      const result = await checkGHCLI();

      expect(result).toBe(true);
    });

    it("should return false when gh CLI is not authenticated", async () => {
      const mockExec = vi.mocked(childProcess.exec);
      mockExec.mockImplementationOnce((_cmd, callback) => {
        const error = new Error("not authenticated") as ExecException;
        const output: MockExecOutput = { stdout: "", stderr: "" };
        callback?.(error, output, "");
        return undefined as unknown as childProcess.ChildProcess;
      });

      const result = await checkGHCLI();

      expect(result).toBe(false);
    });
  });
});
