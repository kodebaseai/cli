/**
 * Configuration Step
 *
 * Generates KodebaseConfig from selected preset and saves to .kodebase/config/settings.yml
 */

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ConfigPreset } from "@kodebase/config";
import { DEFAULT_CONFIG_PATH, soloPreset } from "@kodebase/config";
import { Box, Text, useInput } from "ink";
import type { FC } from "react";
import { useEffect, useState } from "react";
import { stringify as stringifyYAML } from "yaml";

interface ConfigurationStepProps {
  onComplete: () => void;
  onError: (error: Error) => void;
  preset?: ConfigPreset;
  presetName?: "solo" | "small_team" | "enterprise";
  force?: boolean;
  verbose?: boolean;
}

interface ConfigStatus {
  saving: boolean;
  saved: boolean;
  configPath: string;
  existsBefore: boolean;
  error?: string;
}

/**
 * Configuration Step
 *
 * Generates KodebaseConfig from the selected preset and saves it to
 * .kodebase/config/settings.yml in the project root.
 */
export const ConfigurationStep: FC<ConfigurationStepProps> = ({
  onComplete,
  onError,
  preset,
  presetName = "solo",
  force,
  verbose,
}) => {
  const [status, setStatus] = useState<ConfigStatus>({
    saving: true,
    saved: false,
    configPath: join(process.cwd(), DEFAULT_CONFIG_PATH),
    existsBefore: false,
  });
  const [canProceed, setCanProceed] = useState(false);

  useEffect(() => {
    const saveConfig = async () => {
      try {
        const configPath = join(process.cwd(), DEFAULT_CONFIG_PATH);
        const configDir = dirname(configPath);

        // Check if config already exists
        const existsBefore = existsSync(configPath);

        if (existsBefore && !force) {
          setStatus({
            saving: false,
            saved: false,
            configPath,
            existsBefore: true,
            error: "Configuration already exists. Use --force to overwrite.",
          });
          onError(
            new Error(
              "Configuration already exists. Use --force to overwrite.",
            ),
          );
          return;
        }

        // Ensure config directory exists
        await mkdir(configDir, { recursive: true });

        // Use provided preset or default to solo
        const configToSave = preset || soloPreset;

        // Convert to YAML and save
        const yamlContent = stringifyYAML(configToSave);
        await writeFile(configPath, yamlContent, "utf-8");

        setStatus({
          saving: false,
          saved: true,
          configPath,
          existsBefore,
        });

        setCanProceed(true);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setStatus((prev) => ({
          ...prev,
          saving: false,
          error: errorMessage,
        }));
        onError(new Error(`Failed to save configuration: ${errorMessage}`));
      }
    };

    saveConfig();
  }, [preset, force, onError]);

  useInput((_, key) => {
    if (key.return && canProceed) {
      onComplete();
    }
  });

  if (status.saving) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold>Generating Configuration</Text>
        </Box>

        <Box marginBottom={1}>
          <Text>Saving configuration to {DEFAULT_CONFIG_PATH}...</Text>
        </Box>
      </Box>
    );
  }

  if (status.error) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="red">
            Configuration Error
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text color="red">✗ {status.error}</Text>
        </Box>

        {verbose && (
          <Box marginTop={1}>
            <Text dimColor>Config path: {status.configPath}</Text>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text bold>Configuration Generated</Text>
      </Box>

      <Box marginBottom={1}>
        <Text>
          <Text color="green">✓</Text> Configuration saved to{" "}
          {DEFAULT_CONFIG_PATH}
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text>
          <Text color="green">✓</Text> Using preset:{" "}
          <Text bold color="cyan">
            {presetName}
          </Text>
        </Text>
      </Box>

      <Box marginBottom={1} flexDirection="column" marginLeft={2}>
        <Text dimColor>Configuration summary:</Text>
        <Text dimColor>
          - Post-merge:{" "}
          {preset?.gitOps?.post_merge?.strategy === "direct_commit"
            ? "Direct commit (fast)"
            : "Cascade PR"}
        </Text>
        <Text dimColor>- Post-checkout: Auto-update artifact status</Text>
        <Text dimColor> - Platform: GitHub (gh CLI)</Text>
        <Text dimColor> - Hooks: Git hooks will be installed next</Text>
      </Box>

      {status.existsBefore && force && (
        <Box marginBottom={1}>
          <Text color="yellow">⚠ Overwrote existing configuration</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text>
          Press{" "}
          <Text bold color="green">
            Enter
          </Text>{" "}
          to continue
        </Text>
      </Box>

      {verbose && (
        <Box marginTop={1}>
          <Text dimColor>Config path: {status.configPath}</Text>
        </Box>
      )}
    </Box>
  );
};
