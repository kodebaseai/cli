/**
 * AI Environment Detection Utilities
 *
 * Detects whether the user is in an IDE environment (Cursor, VSCode)
 * or using web-based AI (ChatGPT, Claude web, etc.)
 *
 * Based on spec: .kodebase/docs/specs/cli/artifact-wizard.md (lines 770-812)
 */

import fs from "node:fs/promises";
import path from "node:path";

import yaml from "yaml";

import type { AIEnvironment } from "../types.js";

interface AgentConfig {
  available: boolean;
  integrationTypes: string[];
  primary?: boolean;
}

interface KodebaseConfig {
  agents?: Record<string, AgentConfig>;
}

/**
 * Detects the AI environment (IDE or web-based)
 *
 * Priority:
 * 1. Check agent config from setup wizard (if exists)
 * 2. Fall back to environment variable detection
 * 3. Default to web-based
 */
export async function detectAIEnvironment(
  baseDir = process.cwd(),
): Promise<AIEnvironment> {
  // Try to load agent config from setup wizard
  const config = await loadKodebaseConfig(baseDir);

  if (config?.agents) {
    // Check if user has IDE composer capabilities
    const hasIDEComposer = Object.values(config.agents).some(
      (agent) =>
        agent.available && agent.integrationTypes?.includes("ide_composer"),
    );

    if (hasIDEComposer) {
      return "ide";
    }
  }

  // Fallback: Environment variable detection
  if (detectIDEFromEnvironment()) {
    return "ide";
  }

  // Default to web-based
  return "web";
}

/**
 * Load Kodebase configuration from setup wizard
 */
async function loadKodebaseConfig(
  baseDir: string,
): Promise<KodebaseConfig | null> {
  try {
    const configPath = path.join(baseDir, ".kodebase/config/settings.yml");
    const configContent = await fs.readFile(configPath, "utf-8");
    return yaml.parse(configContent) as KodebaseConfig;
  } catch {
    // Config doesn't exist yet (setup not run) - return null
    return null;
  }
}

/**
 * Detect IDE environment from environment variables
 */
function detectIDEFromEnvironment(): boolean {
  // Cursor IDE
  if (process.env.CURSOR_IDE || process.env.VSCODE_CURSOR) {
    return true;
  }

  // VSCode (including VSCode with Claude extension)
  if (process.env.VSCODE_PID || process.env.TERM_PROGRAM === "vscode") {
    return true;
  }

  return false;
}

/**
 * Get a human-readable name for the AI environment
 */
export function getAIEnvironmentName(env: AIEnvironment): string {
  switch (env) {
    case "ide":
      return "IDE (Cursor, VSCode, etc.)";
    case "web":
      return "Web-based AI (ChatGPT, Claude, etc.)";
  }
}
