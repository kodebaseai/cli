# @kodebase/cli

Kodebase CLI - Structured knowledge management for software projects using Git as a database.

## Status

🚧 **Alpha Version 0.1.0** - This package is currently being scaffolded as part of the E.1.1 milestone.

## Installation

```bash
pnpm install
```

## Development

```bash
# Build the CLI
pnpm build

# Run type checking
pnpm check-types

# Run tests
pnpm test

# Lint code
pnpm lint
```

## Package Structure

```
packages/cli/
├── src/
│   ├── commands/      # CLI command implementations
│   ├── components/    # React/Ink UI components
│   ├── utils/         # Utility functions
│   ├── types/         # TypeScript type definitions
│   ├── integrations/  # External integrations
│   ├── index.ts       # Main entry point
│   ├── cli.ts         # CLI bootstrapping
│   └── App.tsx        # Main application component
├── test/              # Test files
└── dist/              # Build output
```

## Dependencies

This package depends on the following workspace packages:
- `@kodebase/core` - Core utilities and domain models
- `@kodebase/artifacts` - Artifact management
- `@kodebase/git-ops` - Git operations
- `@kodebase/config` - Configuration management

## License

MIT
