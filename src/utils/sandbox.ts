/**
 * Tutorial Environment Management
 *
 * Sets up tutorial artifacts in the current project's .kodebase/artifacts/
 * directory under a X initiative for hands-on learning.
 */

import { existsSync, promises as fs } from "node:fs";
import * as path from "node:path";

/**
 * Verifies and prepares the current directory for tutorial use.
 *
 * Uses the actual .kodebase/artifacts/ directory in the current working
 * directory, creating demo artifacts under a X initiative that users
 * can explore in their file system.
 *
 * @returns Promise resolving to the current working directory path
 * @throws Error if .kodebase/artifacts directory doesn't exist or can't be created
 */
export async function createSandbox(): Promise<string> {
  try {
    const workingDir = process.cwd();
    const kodebaseDir = path.join(workingDir, ".kodebase");
    const artifactsDir = path.join(kodebaseDir, "artifacts");

    // Check if .kodebase/artifacts exists, create if not
    if (!existsSync(artifactsDir)) {
      await fs.mkdir(artifactsDir, { recursive: true });
    }

    // Verify we can write to the directory
    await fs.access(artifactsDir, fs.constants.W_OK);

    return workingDir;
  } catch (error) {
    throw new Error(
      `Failed to prepare tutorial environment: ${error instanceof Error ? error.message : String(error)}. Make sure you're in a kodebase project directory or run 'git init' first.`,
    );
  }
}

/**
 * Cleans up tutorial artifacts (X initiative) from the project.
 *
 * @param workingDir Path to the working directory containing .kodebase
 * @throws Error if cleanup fails (non-critical, should not stop execution)
 */
export async function cleanupSandbox(workingDir: string): Promise<void> {
  try {
    const artifactsDir = path.join(workingDir, ".kodebase", "artifacts");

    // Find all directories starting with "X." (tutorial initiative)
    const entries = await fs.readdir(artifactsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith("X.")) {
        const tutorialDir = path.join(artifactsDir, entry.name);
        await fs.rm(tutorialDir, { recursive: true, force: true });
      }
    }
  } catch (error) {
    // Non-critical error - log but don't throw
    console.warn("Warning: Failed to cleanup tutorial artifacts:", error);
  }
}

/**
 * Checks if a path is a valid kodebase project directory.
 *
 * @param targetPath Path to check
 * @returns true if the path contains a .kodebase/artifacts directory
 */
export function isSandboxPath(targetPath: string): boolean {
  const artifactsDir = path.join(targetPath, ".kodebase", "artifacts");
  return existsSync(artifactsDir);
}

/**
 * Gets the working directory for tutorial operations.
 *
 * @param workingDir Optional working directory path
 * @returns Working directory path (provided or current directory)
 */
export function getWorkingDirectory(workingDir?: string): string {
  return workingDir || process.cwd();
}
