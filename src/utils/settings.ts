/**
 * Settings Utilities
 *
 * Load and parse .kodebase/config/settings.yml
 */

import fs from "node:fs/promises";
import path from "node:path";
import yaml from "yaml";

export interface Settings {
  version?: string;
  gitOps?: {
    platform?: {
      type?: string;
      auth_strategy?: string;
      github?: {
        token_env_var?: string;
        api_url?: string;
      };
    };
    pr_creation?: {
      auto_assign?: boolean;
      auto_add_labels?: boolean;
      auto_request_reviewers?: boolean;
      default_reviewers?: string[];
      additional_labels?: string[];
    };
    branches?: {
      mainBranch?: string;
      artifact_branch_format?: string;
      delete_after_merge?: boolean;
      require_pr_for_main?: boolean;
    };
    post_checkout?: {
      create_draft_pr?: boolean;
      auto_assign?: boolean;
      auto_add_labels?: boolean;
    };
    post_merge?: {
      strategy?: string;
      cascade_pr?: {
        auto_merge?: boolean;
        require_checks?: boolean;
        delete_branch?: boolean;
        labels?: string[];
      };
    };
    hooks?: {
      enabled?: boolean;
      non_blocking?: boolean;
      log_level?: string;
      pre_commit?: {
        enabled?: boolean;
        validate_schema?: boolean;
        validate_state_machine?: boolean;
        validate_dependencies?: boolean;
      };
      pre_push?: {
        enabled?: boolean;
        warn_wip_artifacts?: boolean;
        warn_non_artifact_branches?: boolean;
      };
    };
    validation?: {
      enforce_schema?: boolean;
      enforce_state_machine?: boolean;
      enforce_dependencies?: boolean;
      warn_missing_fields?: boolean;
      error_on_warnings?: boolean;
    };
    cascades?: {
      mode?: string;
      dry_run?: boolean;
    };
    commits?: {
      format?: string;
      add_coauthor?: boolean;
    };
  };
  artifactsDir?: string;
}

const DEFAULT_SETTINGS: Settings = {
  version: "1.0",
  gitOps: {
    branches: {
      mainBranch: "main",
    },
  },
  artifactsDir: ".kodebase/artifacts",
};

/**
 * Load settings from .kodebase/config/settings.yml
 */
export async function loadSettings(
  baseDir: string = process.cwd(),
): Promise<Settings> {
  const settingsPath = path.join(baseDir, ".kodebase/config/settings.yml");

  try {
    const content = await fs.readFile(settingsPath, "utf8");
    const settings = yaml.parse(content) as Settings;
    return { ...DEFAULT_SETTINGS, ...settings };
  } catch {
    // Return defaults if file doesn't exist or can't be read
    return DEFAULT_SETTINGS;
  }
}
