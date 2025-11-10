import { Box, Text } from "ink";
import type { FC } from "react";
import { version } from "../index.js";

// Import package versions from workspace packages
// These will be replaced by bundler with actual values
const getPackageVersions = () => {
  try {
    // Try to dynamically import package.json files
    return {
      cli: version,
      core: "1.0.1", // @kodebase/core
      artifacts: "1.1.2", // @kodebase/artifacts
      gitOps: "1.0.0", // @kodebase/git-ops
      config: "0.2.1", // @kodebase/config
    };
  } catch {
    return {
      cli: version,
      core: "unknown",
      artifacts: "unknown",
      gitOps: "unknown",
      config: "unknown",
    };
  }
};

export const Version: FC = () => {
  const versions = getPackageVersions();
  const nodeVersion = process.version;
  const platform = process.platform;

  const getPlatformName = (platform: string): string => {
    switch (platform) {
      case "darwin":
        return "macOS";
      case "win32":
        return "Windows";
      case "linux":
        return "Linux";
      default:
        return platform;
    }
  };

  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>
        Kodebase CLI v{versions.cli}
      </Text>
      <Text> </Text>

      <Text color="cyan" bold>
        Foundation Packages:
      </Text>
      <Box marginLeft={2} flexDirection="column">
        <Text>
          <Text color="gray">@kodebase/core </Text>
          <Text color="green">v{versions.core}</Text>
        </Text>
        <Text>
          <Text color="gray">@kodebase/artifacts </Text>
          <Text color="green">v{versions.artifacts}</Text>
        </Text>
        <Text>
          <Text color="gray">@kodebase/git-ops </Text>
          <Text color="green">v{versions.gitOps}</Text>
        </Text>
        <Text>
          <Text color="gray">@kodebase/config </Text>
          <Text color="green">v{versions.config}</Text>
        </Text>
      </Box>
      <Text> </Text>

      <Text>
        <Text color="gray">Node.js: </Text>
        <Text>{nodeVersion}</Text>
      </Text>
      <Text>
        <Text color="gray">Platform: </Text>
        <Text>
          {platform} ({getPlatformName(platform)})
        </Text>
      </Text>
    </Box>
  );
};
