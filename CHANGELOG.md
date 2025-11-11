# @kodebase/cli

## 0.1.0

### Minor Changes

- [#225](https://github.com/kodebaseai/kodebase/pull/225) [`e565120`](https://github.com/kodebaseai/kodebase/commit/e565120481ab26d08ad79064314be3ae137a0522) Thanks [@migcarva](https://github.com/migcarva)! - feat(cli): foundation & package setup - complete E.1 milestone

  ## Summary

  Set up CLI package structure with complete build toolchain, ported core utilities and base React/Ink components from legacy CLI, and established working kb --version and kb --help commands with comprehensive test coverage.

  ## Milestone E.1: Foundation & Package Setup

  ### E.1.1 Package Scaffolding & Build Setup

  - Created `packages/cli/` directory structure with proper organization (commands, components, utils, types, integrations)
  - Configured build toolchain: tsup for ESM bundling with shebang, vitest for testing, biome for linting
  - Established package.json with workspace:\* dependencies for all foundation packages
  - Set up binary entry points: `kb` and `kodebase` commands
  - Enabled TypeScript strict mode via @kodebase/typescript-config

  ### E.1.2 Core Types & Utility Functions

  - Ported error types with custom error classes (CLIError, ArtifactNotFoundError, ValidationError, etc.)
  - Created integration layer re-exporting @kodebase/core types with cleaner aliases (TArtifactType as ArtifactType)
  - Ported performance utilities with PerformanceTimer class for consistent timing
  - Wrote 26 comprehensive tests for performance utilities (100% coverage)
  - Established foundation for config management following XDG spec (~/.config/kodebase/)

  ### E.1.3 Base Components & CLI Entry Point

  - Ported React/Ink base components: ErrorHandler (with error boundary), StatusBadge (status color mapping), Version (CLI + packages), Help (branding + commands)
  - Created CLI entry points: index.ts (executable with shebang), cli.tsx (command routing), App.tsx (root component)
  - Implemented command routing for version/help/unknown commands with default help fallback
  - **Fixed Node.js compatibility**: Replaced failing ink-testing-library tests with subprocess-based integration tests using execa (~50% faster, 4.6s vs 9.1s)
  - **Migrated to modern JSX transform**: Changed from classic React imports to react-jsx transform, removing unnecessary React imports
  - Wrote 92 comprehensive behavioral tests following how-to-test.mdc guidelines (74% coverage)

  ## What's Working

  ```bash
  kb --version  # Shows CLI v0.1.0-alpha.1, foundation packages, Node.js, platform
  kb --help     # Shows usage, commands, options, documentation link
  kb            # Defaults to help
  kb unknown    # Shows error with suggestion to run 'kb --help'
  ```
