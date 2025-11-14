# @kodebase/cli

> Structured knowledge management for software projects using Git as a database

[![npm version](https://img.shields.io/npm/v/@kodebase/cli.svg)](https://www.npmjs.com/package/@kodebase/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Kodebase CLI is a command-line tool that helps teams manage software projects through structured artifacts stored in Git. Break down initiatives into milestones and issues, track progress, and generate AI-ready context for development workflows.

## Features

- 📝 **Artifact Management** - Create and organize initiatives, milestones, and issues
- 🚀 **Workflow Automation** - Start work with automatic branch creation and context generation
- 📊 **Progress Tracking** - View status and relationships across all artifacts
- 🤖 **AI Integration** - Generate formatted context for AI assistants
- ✅ **Validation** - Ensure artifact consistency and correctness
- ⚙️ **Setup Wizard** - Interactive configuration for teams of any size
- 📚 **Tutorial** - Learn the workflow interactively

## Installation

### Global Installation (Recommended)

```bash
npm install -g @kodebase/cli@alpha
```

### Local Installation

```bash
npm install --save-dev @kodebase/cli
```

## Quick Start

### 1. Initial Setup

Run the setup wizard to configure your project:

```bash
kb setup
```

Choose your team size preset:
- **Solo**: Fast iteration, direct commits
- **Small Team (2-10)**: Cascade PRs with auto-merge
- **Enterprise (10+)**: Manual approval workflow

### 2. Create Your First Artifact

```bash
# Create an initiative
kb add

# Create a milestone under initiative A
kb add A

# Create an issue under milestone A.1
kb add A.1
```

### 3. Start Working

```bash
# Start work on an issue
kb start A.1.1

# View generated context
kb ctx A.1.1
```

### 4. Track Progress

```bash
# View single artifact status
kb status A.1.1

# View all artifacts
kb status --all
```

### 5. Validate Structure

```bash
# Validate specific artifact
kb validate A.1.1

# Validate all artifacts
kb validate
```

## Core Workflow Example

```bash
# 1. Set up project
kb setup --preset=small_team

# 2. Create project structure
kb add                    # Initiative A: Payment System
kb add A                  # Milestone A.1: Core Features
kb add A.1                # Issue A.1.1: Stripe Integration

# 3. Start development
kb start A.1.1            # Creates branch, generates context

# 4. Get AI context
kb ctx A.1.1 --copy       # Copies to clipboard for AI

# 5. Check status
kb status A.1             # View milestone progress

# 6. Validate work
kb validate A.1.1         # Ensure artifact is valid
```

## Command Reference

### Core Commands

#### `kb add [parent] [title]`

Create new artifacts (initiatives, milestones, or issues) with an interactive wizard.

```bash
kb add                     # Create initiative (root level)
kb add A                   # Create milestone under A
kb add A.1                 # Create issue under A.1
kb add A.1 "Feature name"  # Create with title
```

**Options:**
- `--title=<title>` - Set artifact title directly
- `--priority=<level>` - Set priority (low, medium, high, critical)
- `--estimation=<size>` - Set estimation (XS, S, M, L, XL, XXL)
- `--verbose` - Show detailed output

#### `kb start <artifact-id>`

Start work on an artifact: creates branch, updates status, and generates context.

```bash
kb start A.1.1              # Start work on issue
kb start A.1.1 --submit     # Start and create draft PR
```

**Options:**
- `--submit` - Create draft PR after starting
- `--verbose` - Show detailed output

#### `kb status <artifact-id>`

Display artifact status, metadata, and relationships.

```bash
kb status A.1.1             # Single artifact status
kb status --all             # All artifacts table view
kb status --all --json      # JSON output
```

**Options:**
- `--all` - Show all artifacts
- `--state=<state>` - Filter by state
- `--assignee=<name>` - Filter by assignee
- `--json` - Output as JSON
- `--verbose` - Show detailed output

#### `kb ctx <artifact-id>`

Generate AI-ready context from artifact metadata.

```bash
kb ctx A.1.1                      # Standard format
kb ctx A.1.1 --format=compact     # Minimal format
kb ctx A.1.1 --format=detailed    # Full hierarchy
kb ctx A.1.1 --copy               # Copy to clipboard
kb ctx A.1.1 --output=context.md  # Save to file
```

**Options:**
- `--format=<type>` - Output format (standard, compact, detailed)
- `--copy` - Copy to clipboard
- `--output=<file>` - Save to file
- `--verbose` - Show detailed output

#### `kb validate [artifact-id]`

Validate artifact structure and metadata.

```bash
kb validate A.1.1           # Validate single artifact
kb validate                 # Validate all artifacts
kb validate --fix           # Auto-fix issues
kb validate --strict        # Strict validation mode
```

**Options:**
- `--fix` - Automatically fix validation issues
- `--strict` - Use strict validation rules
- `--json` - Output as JSON
- `--verbose` - Show detailed output

### Setup Commands

#### `kb setup`

Interactive setup wizard for project configuration.

```bash
kb setup                            # Full wizard
kb setup --preset=solo              # Solo developer preset
kb setup --preset=small_team        # Small team preset
kb setup --preset=enterprise        # Enterprise preset
kb setup --skip-auth                # Skip GitHub auth
kb setup --skip-hooks               # Skip hook installation
kb setup --force                    # Overwrite existing config
```

**Options:**
- `--preset=<type>` - Team size preset (solo, small_team, enterprise)
- `--skip-auth` - Skip GitHub authentication step
- `--skip-hooks` - Skip git hook installation
- `--force` - Overwrite existing configuration
- `--verbose` - Show detailed output

#### `kb tutorial`

Interactive tutorial to learn the Kodebase workflow.

```bash
kb tutorial                 # Start tutorial
```

### Utility Commands

#### `kb help [command]`

Show help for commands.

```bash
kb help                     # General help
kb help add                 # Help for add command
```

#### `kb version`

Display version information.

```bash
kb version                  # Show CLI and package versions
```

## Configuration

### Configuration File

Configuration is stored in `.kodebase/config/settings.yml`:

```yaml
version: "0.1.0"
preset: small_team
git:
  autoPush: true
  requirePR: true
output:
  format: standard
  verbose: false
```

### Team Presets

#### Solo Developer
- Direct commits to main
- No PR requirements
- Fast iteration
- Minimal overhead

#### Small Team (2-10)
- Feature branches required
- Cascade PRs with auto-merge
- Balanced workflow
- Team coordination

#### Enterprise (10+)
- Strict PR workflow
- Manual approval required
- Full audit trail
- Compliance ready

### Git Hooks

Kodebase installs git hooks for automation:

- `post-checkout` - Update artifact status on branch switch
- `post-merge` - Cascade status changes on PR merge
- `post-commit` - Track work progress

## Project Structure

```
.kodebase/
├── artifacts/              # Artifact YAML files
│   ├── A.initiative.yml
│   ├── A/
│   │   ├── A.1.milestone.yml
│   │   └── A.1/
│   │       └── A.1.1.issue.yml
└── config/
    └── settings.yml        # Configuration

packages/cli/
├── src/
│   ├── commands/          # CLI command implementations
│   ├── components/        # React/Ink UI components
│   ├── utils/             # Utility functions
│   └── types/             # TypeScript type definitions
├── test/                  # Test files
└── dist/                  # Build output
```

## Troubleshooting

### Command Not Found

If `kb` command is not found after installation:

```bash
# Check if npm global bin is in PATH
npm config get prefix

# Add to PATH (bash/zsh)
export PATH="$(npm config get prefix)/bin:$PATH"
```

### Permission Errors

If you encounter permission errors during global installation:

```bash
# Use npx (no installation needed)
npx @kodebase/cli@alpha setup

# Or fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

### Git Hooks Not Working

If git hooks are not executing:

```bash
# Check hook files exist
ls -la .git/hooks/

# Reinstall hooks
kb setup --force
```

### Clipboard Issues in CI

The `--copy` flag may not work in headless/CI environments. Use `--output` instead:

```bash
kb ctx A.1.1 --output=context.md
```

## Development

### Prerequisites

- Node.js ≥ 18
- pnpm ≥ 8
- Git

### Setup

```bash
# Clone repository
git clone https://github.com/kodebaseai/kodebase.git
cd kodebase

# Install dependencies
pnpm install

# Build packages
pnpm build

# Run tests
pnpm test

# Link locally
cd packages/cli
pnpm link --global
```

### Testing

```bash
# Run all tests
pnpm --filter @kodebase/cli test

# Run with coverage
pnpm --filter @kodebase/cli test --coverage

# Run type checking
pnpm --filter @kodebase/cli check-types

# Run linter
pnpm --filter @kodebase/cli lint
```

### Package Dependencies

This package depends on:
- `@kodebase/core` - Core utilities and domain models
- `@kodebase/artifacts` - Artifact management
- `@kodebase/git-ops` - Git operations
- `@kodebase/config` - Configuration management

## API Documentation

Full API documentation is available at [docs.kodebase.ai/cli](https://docs.kodebase.ai/cli).

TypeDoc-generated API docs can be found in the `docs/` directory after building.

## Known Limitations

- **Monk Enhancement**: Not yet implemented (post-MLP)
- **Complete/Cancel Commands**: Coming in next release
- **Windows**: Native support pending (WSL2 works)
- **Shell Completion**: May require manual setup

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`kb add` for new features)
3. Make your changes
4. Add tests for new functionality
5. Ensure tests pass (`pnpm test`)
6. Submit a pull request

## License

MIT © Kodebase

## Links

- [Documentation](https://docs.kodebase.ai)
- [GitHub Repository](https://github.com/kodebaseai/kodebase)
- [Issue Tracker](https://github.com/kodebaseai/kodebase/issues)
- [npm Package](https://www.npmjs.com/package/@kodebase/cli)

## Support

- 📧 Email: support@kodebase.ai
- 💬 Discord: [Join our community](https://discord.gg/kodebase)
- 🐛 Issues: [GitHub Issues](https://github.com/kodebaseai/kodebase/issues)
