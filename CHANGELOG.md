# @kodebase/cli

## 0.4.0

### Minor Changes

- [#248](https://github.com/kodebaseai/kodebase/pull/248) [`90061dc`](https://github.com/kodebaseai/kodebase/commit/90061dc896728511867bd9e4e608d6d12b29d20b) Thanks [@migcarva](https://github.com/migcarva)! - feat(cli): Add command with AI-assisted wizard, artifact picker, and test coverage improvements

  Completed E.4 (Add Command & Wizard) milestone implementing comprehensive artifact creation flow:

  **E.4.1: Wizard Flow & Step Components**

  - AI-assisted wizard with 6 step components supporting both IDE and web-based AI workflows
  - Dual-flow architecture: IDE flow uses chokidar file watcher (60s timeout), web flow manual creation with validation
  - AI environment detection (CURSOR_IDE, VSCODE_CURSOR, VSCODE_PID, TERM_PROGRAM) with config-based fallback
  - Context-aware AI prompt generation for natural language artifact creation
  - Comprehensive wizard tests with state management and navigation validation

  **E.4.2: Artifact Picker & Preview Components**

  - ArtifactPicker with fuzzy search across ID, title, and type fields (exact=100, contains=80, sequence=60 scoring)
  - ArtifactPreview displaying metadata, status, relationships, and validation errors
  - Migrated from legacy ArtifactLoader to @kodebase/core APIs (loadAllArtifactPaths, readArtifact, parse functions)
  - Dual-mode keyboard navigation (search input vs arrow key navigation) with hierarchical indentation
  - Real-time filtering with useMemo and type-based artifact filtering

  **E.4.3: Test Coverage & Bug Fixes**

  - Improved CLI test coverage from 75.77% to 87.91% (355 tests passing)
  - ai-environment.ts: 13.63% → 100% (11 comprehensive tests with environment isolation)
  - parent-validation.ts: 30.76% → 100% (12 tests with proper mock constructors)
  - errors.ts: 52.38% → 100% (33 tests for all error classes)
  - Fixed TypeScript linting issues in git-branch.test.ts (removed as any assertions, proper type definitions)
  - Fixed clipboard functionality in Context.tsx to only show success message when clipboard.write() succeeds (CI test fix)

  **Technical Highlights:**

  - ScaffoldingService integration for ID allocation with multi-letter initiative support (A, AA, AB)
  - ArtifactService.createArtifact() replacing all direct YAML manipulation
  - ReadinessService integration for parent artifact validation
  - File watching with chokidar for IDE-based artifact creation
  - Fuzzy search utility (fuzzy-search.ts) with configurable search fields and scoring
  - Vitest mock constructors using named function expressions (not arrow functions)
  - Environment variable isolation in tests using beforeEach cleanup

  **Bug Fixes:**

  - Fixed environment variable leakage between tests causing 4 test failures
  - Fixed clipboard success message in CI environments (headless/no display)
  - Fixed mock constructor "is not a constructor" errors with proper function expressions
  - Fixed unused function parameter linting errors (cmd → \_cmd)
  - Removed all non-null assertions with proper null checks and type guards

## 0.3.0

### Minor Changes

- [#240](https://github.com/kodebaseai/kodebase/pull/240) [`db77ee9`](https://github.com/kodebaseai/kodebase/commit/db77ee9445b740a6b552da9a7c6cefe118d916cf) Thanks [@migcarva](https://github.com/migcarva)! - feat(cli): add validate, context, tutorial, and command-specific help

  Completes E.3 milestone with comprehensive validation, AI context generation, interactive tutorial, and command-specific help system:

  **Validate Command (E.3.1)**

  - Artifact validation with ValidationService integration
  - Multiple output formats: human-readable and JSON
  - Auto-fix capability for common issues (--fix flag)
  - Strict mode for CI/CD (--strict flag exits 1 on warnings)
  - Clear error formatting with validation suggestions
  - Support for single artifact or all artifacts validation

  **Context Command (E.3.2)**

  - AI-optimized context generation from artifacts
  - Three format options: standard (default), compact, detailed
  - Hierarchical parent context for proper scope establishment
  - Clipboard integration via --copy flag
  - File output via --output flag
  - Metadata, relationships, and acceptance criteria included

  **Tutorial Command (E.3.3)**

  - 7-step interactive tutorial walkthrough
  - Creates demo artifacts in .kodebase/artifacts/X.\*
  - Progress tracking with resume capability
  - State persistence in ~/.kodebase/tutorial/progress.json
  - Automatic cleanup on completion or early exit
  - Visual progress bar and step indicators
  - Covers: concepts, artifact creation, Git workflow, CLI commands

  **Command-Specific Help (E.3.3)**

  - kb help <command> for detailed command documentation
  - Comprehensive help for: start, status, validate, ctx, tutorial
  - Usage syntax, options, examples for each command
  - "What happens" explanations for workflow commands
  - Unknown command error with helpful suggestions
  - Context/ctx alias support maintained

  **Testing & Quality**

  - 243 tests passing (up from 221)
  - 85.47% coverage (up from 84.91%)
  - Help.tsx: 100% test coverage
  - Comprehensive command-specific help tests (22 new tests)
  - Tutorial state persistence tests (19 tests)
  - Integration with existing ArtifactService and ScaffoldingService APIs

  Resolves E.3 milestone - Validate, Context & Tutorial Commands

## 0.2.0

### Minor Changes

- [#230](https://github.com/kodebaseai/kodebase/pull/230) [`c06d7ba`](https://github.com/kodebaseai/kodebase/commit/c06d7baa3692a1612b6cf6003bfe3267c27e73a8) Thanks [@migcarva](https://github.com/migcarva)! - **E.2: Start & Status Commands**

  Implement `kb start` and `kb status` commands for working with artifacts, providing comprehensive workflow automation and status visualization.

  ## Features

  ### Start Command (`kb start <artifact-id>`)

  - Readiness validation using ReadinessService before allowing work to begin
  - Automatic feature branch creation with artifact ID as branch name
  - AI-ready context generation from artifact metadata including parent hierarchy
  - Clipboard integration for seamless context sharing with AI assistants
  - `--submit` flag for automated PR creation and status transitions
  - Comprehensive error handling for blocked/in-progress/non-existent artifacts
  - Already-in-progress detection with branch-aware workflow

  ### Status Command (`kb status`)

  - **Detailed mode**: `kb status <artifact-id>` - Full artifact view with event timeline and relationships
  - **List mode**: `kb status --all` - Table view of all artifacts with status indicators
  - **JSON mode**: `kb status --json` - Machine-readable output for integrations
  - Advanced filtering: `--state=<status>` and `--assignee=<name>` for targeted queries
  - Visual components: EventTimeline, RelationshipList with Unicode icons
  - Terminal utilities: Dynamic width detection, separator generation

  ### Display Components

  - **EventTimeline**: Chronological event history with icons, timestamps, actors, and triggers
  - **RelationshipList**: Dependency visualization with resolution status indicators
  - **StatusBadge**: Enhanced with git-ops lifecycle events (branch_created, pr_ready, pr_merged)

  ### Context Generation

  - Hierarchical context including parent artifact summaries
  - Acceptance criteria and success metrics
  - Relationship mapping (blocked_by, blocks)
  - Metadata (priority, estimation, assignee)
  - Formatted markdown ready for AI consumption

  ### Utilities

  - **context-generator.ts**: Generates AI-ready context from artifacts
  - **Terminal utilities**: Width/height detection, separator creation
  - Test setup improvements: Fake timers, deterministic RNG

  ## Testing

  - 162 total tests (100% pass rate)
  - 82.41% code coverage
  - Subprocess-based integration tests using execa
  - Behavioral tests with documented domain invariants
  - Fake timers for deterministic time-dependent logic
  - Biome lint rules for test hygiene (noFocusedTests, noSkippedTests)

  ## Technical Details

  ### Dependencies

  - Added `clipboardy` for cross-platform clipboard operations
  - Integrated with ReadinessService for artifact validation
  - Uses simple-git for branch operations
  - git-ops adapters for PR automation

  ### Implementation Highlights

  - Event sourcing pattern with `appendEvent()` for status updates
  - Branch naming: artifact ID directly (e.g., `E.2.3`)
  - Draft PRs created by default with `--submit` flag
  - Time injection for testable date-dependent components
  - Stable event sorting with primary (timestamp) + secondary (event type) keys

  ### Quality Improvements

  - Component-level time injection vs global mocks
  - Fixed-width Box components for consistent column alignment
  - Dynamic relationship labels based on artifact state
  - Terminal width clamping (40-200 chars) for layout stability

  ## Child Artifacts Completed

  - **E.2.1**: Status Display Components (EventTimeline, RelationshipList)
  - **E.2.2**: Status Command (detailed/list/JSON modes, filtering)
  - **E.2.3**: Start Command (readiness validation, context generation, PR automation)

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
