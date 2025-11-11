import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    pool: "threads",
    setupFiles: ["./test/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "test/**/*.test.ts"],
    exclude: [
      "test/e2e/**/*.test.ts",
      "**/node_modules/**",
      "src/App.test.tsx", // Archived - replaced by test/cli.test.ts
      "src/components/Version.test.tsx", // Archived - replaced by test/cli.test.ts
    ],
    coverage: {
      provider: "istanbul",
      reporter: [
        "text",
        "text-summary",
        "lcov",
        [
          "json",
          {
            file: "../coverage.json",
          },
        ],
      ],
      enabled: true,
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "test/**", // Exclude subprocess integration tests from coverage
        "src/App.test.tsx",
        "src/components/Version.test.tsx",
      ],
      // Thresholds set to current coverage levels - coverage should never go down
      thresholds: {
        lines: 70,
        functions: 60,
        branches: 60,
        statements: 70,
      },
    },
  },
});
