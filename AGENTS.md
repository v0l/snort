# AGENTS.md - Snort Codebase Guidelines

This document provides guidelines for AI coding agents working in the Snort codebase.

## Project Overview

Snort is a **Nostr UI client** built with:
- **Language**: TypeScript (strict mode)
- **Framework**: React 19 (main app)
- **Build Tool**: Vite
- **Package Manager**: Bun (required - do not use npm/yarn/pnpm)
- **Monorepo**: Bun workspaces

### Package Structure
```
packages/
  app/           # Main React web application (@snort/app)
  system/        # Core Nostr system library (@snort/system)
  shared/        # Shared utilities (@snort/shared)
  wallet/        # Wallet integration (@snort/wallet)
  worker-relay/  # Service worker relay (@snort/worker-relay)
  system-react/  # React hooks for system (@snort/system-react)
```

## Build Commands

```bash
# Install dependencies
bun install

# Build all packages (order matters - shared -> system -> wallet -> worker-relay -> app)
bun run build

# Start dev server
bun run start

# Build specific package
bun --cwd=packages/app run build
bun --cwd=packages/system run build
```

## Testing

**Framework**: Bun's built-in test runner (`bun:test`)

```bash
# Run all tests
bun test

# Run tests in a specific package
cd packages/system && bun test

# Run a single test file
bun test packages/system/tests/nip10.test.ts

# Run tests matching a pattern
bun test --test-name-pattern="parseThread"

# Run test files matching a name
bun test nip10
```

**Test file locations**:
- `packages/system/tests/*.test.ts` (most tests)
- `packages/app/tests/*.test.ts`
- `packages/shared/src/**/*.test.ts`

## Linting & Formatting

**Tool**: Biome (not ESLint/Prettier)

```bash
# Lint and fix
bunx --bun biome lint --write

# Pre-commit (extract translations + lint)
bun run pre:commit
```

## Code Style Guidelines

### Formatting (Biome)
- **Indentation**: 2 spaces
- **Line width**: 120 characters
- **Semicolons**: as needed (omit when optional)
- **Quotes**: single quotes for JS/TS, double quotes for JSX attributes
- **Trailing commas**: all
- **Arrow parentheses**: as needed
- **Line endings**: LF

### TypeScript
- **Strict mode** is enabled
- **Target**: ESNext
- **Module resolution**: Bundler
- Use `type` imports for types: `import type { Foo } from './bar'`
- Path alias in app: `@/*` maps to `./src/*`

### Imports
- Biome auto-organizes imports
- Group order: external packages, then internal modules
- Use workspace packages: `@snort/shared`, `@snort/system`, etc.

### Naming Conventions
- **Files**: PascalCase for React components (`Note.tsx`, `EventBuilder.ts`)
- **Files**: kebab-case or camelCase for utilities (`event-builder.ts`, `nostr-link.ts`)
- **Components**: PascalCase (`function Note()`, `function EventComponent()`)
- **Hooks**: camelCase with `use` prefix (`useLogin`, `useModeration`)
- **Types/Interfaces**: PascalCase (`TaggedNostrEvent`, `NoteProps`)
- **Constants**: UPPER_SNAKE_CASE or PascalCase
- **Private class fields**: Use `#` prefix (`#kind`, `#content`)

### React Patterns
- Functional components only
- Use hooks for state management
- Custom hooks in `src/Hooks/` directory
- Components in `src/Components/` with subdirectories by feature
- Pages in `src/Pages/`

### Error Handling
- Use try/catch for async operations
- Prefer optional chaining (`?.`) and nullish coalescing (`??`)
- Return `undefined` for not-found cases rather than throwing

### Nostr-Specific Patterns
- Event kinds defined in `packages/system/src/event-kind.ts`
- NIP implementations in `packages/system/src/impl/nip*.ts`
- Use `EventBuilder` class for constructing events
- Use `NostrLink` for referencing events/profiles
- Tags are arrays: `["e", "eventId", "relay", "marker"]`

## Project-Specific Notes

### Bun Requirements
- Always use `bun` instead of `node`, `npm`, `yarn`, or `pnpm`
- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun install` instead of `npm install`
- Use `bun run <script>` instead of `npm run <script>`
- Bun automatically loads `.env` files - do not use dotenv

### Internationalization
- Uses react-intl for i18n
- Translations in `packages/app/src/translations/`
- Extract strings: `bun --cwd=packages/app run intl-extract`
- Compile translations: `bun --cwd=packages/app run intl-compile`

### Desktop App
- Tauri support in `src-tauri/` (Rust backend)

### Common Imports
```typescript
// From system package
import { EventKind, NostrLink, type TaggedNostrEvent } from "@snort/system"

// From shared package
import { NostrPrefix, unixNow, getPublicKey } from "@snort/shared"

// App internal imports (using path alias)
import { Relay } from "@/Cache"
import useModeration from "@/Hooks/useModeration"
```

### Test Patterns
```typescript
import { describe, expect, test } from "bun:test"

describe("FeatureName", () => {
  test("should do something", () => {
    expect(result).toBe(expected)
  })
})
```

## Quick Reference

| Task | Command |
|------|---------|
| Install deps | `bun install` |
| Build all | `bun run build` |
| Dev server | `bun run start` |
| Run all tests | `bun test` |
| Run single test | `bun test path/to/file.test.ts` |
| Lint & fix | `bunx --bun biome lint --write` |
| Pre-commit | `bun run pre:commit` |
