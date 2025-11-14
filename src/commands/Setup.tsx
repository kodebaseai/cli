/**
 * Setup Command Component
 *
 * Implements the 'kb setup' command for initial configuration.
 *
 * Command syntax:
 * - `kb setup` - Launch interactive 6-step wizard
 * - `kb setup --preset <solo|small_team|enterprise>` - Skip wizard, use preset
 * - `kb setup --skip-auth` - Skip GitHub authentication check
 * - `kb setup --skip-hooks` - Skip hook installation
 * - `kb setup --force` - Overwrite existing config
 *
 * @description
 * This command guides users through the initial setup with 6 steps:
 * 1. Environment Detection (git repo, Node.js, GitHub)
 * 2. GitHub Authentication (gh CLI check)
 * 3. Preset Selection (solo/small_team/enterprise)
 * 4. Configuration Generation (save to .kodebase/config/settings.yml)
 * 5. Hook Installation (HookInstaller from git-ops)
 * 6. Success Confirmation (next steps)
 *
 * @example
 * ```bash
 * kb setup                    # Interactive wizard
 * kb setup --preset solo      # Quick setup with solo preset
 * kb setup --force            # Overwrite existing config
 * ```
 */

import { Box, Text } from "ink";
import type { FC } from "react";
import { useState } from "react";
import { ErrorHandler } from "../components/index.js";
import { SetupWizard } from "../components/setup/SetupWizard.js";

export interface SetupProps {
  verbose?: boolean;
  preset?: "solo" | "small_team" | "enterprise";
  skipAuth?: boolean;
  skipHooks?: boolean;
  force?: boolean;
}

/**
 * Setup command for Kodebase CLI
 *
 * Launches the interactive setup wizard to configure:
 * - Git repository validation
 * - GitHub authentication
 * - Team preset selection
 * - Git hook installation
 * - Project configuration
 */
export const Setup: FC<SetupProps> = ({
  verbose,
  preset,
  skipAuth,
  skipHooks,
  force,
}) => {
  const [error, setError] = useState<Error | null>(null);
  const [completed, setCompleted] = useState(false);

  const handleComplete = () => {
    setCompleted(true);
    // Exit after brief delay to show completion message
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  };

  const handleError = (err: Error) => {
    setError(err);
  };

  if (error) {
    return <ErrorHandler error={error} />;
  }

  if (completed) {
    return (
      <Box paddingY={1}>
        <Text color="green">✓ Setup completed successfully!</Text>
      </Box>
    );
  }

  return (
    <Box paddingY={1}>
      <SetupWizard
        onComplete={handleComplete}
        onError={handleError}
        preset={preset}
        skipAuth={skipAuth}
        skipHooks={skipHooks}
        force={force}
        verbose={verbose}
      />
    </Box>
  );
};
