# AGENTS.md - Snort Codebase Guidelines

## Project

Nostr UI client. TypeScript, React 19, Vite, Bun workspaces monorepo.

**Always use `bun`** — never npm/yarn/pnpm/node. Bun auto-loads `.env` files (no dotenv).

## Packages

| Package | Purpose | Build |
|---------|---------|-------|
| `shared` | Utilities (`@snort/shared`) | `tsc` |
| `system` | Core Nostr library (`@snort/system`) | `tsc` |
| `system-react` | React hooks for system (`@snort/system-react`) | `tsc` + copy CSS |
| `system-wasm` | WASM crypto (`@snort/system-wasm`) | `wasm-pack` (not tsc!) |
| `system-svelte` | Svelte bindings (`@snort/system-svelte`) | `tsc` |
| `wallet` | Wallet integration (`@snort/wallet`) | `tsc` |
| `worker-relay` | Service worker relay (`@snort/worker-relay`) | `tsc` + esbuild bundle |
| `bot` | Bot framework (`@snort/bot`) | `tsc` |
| `app` | Main React web app (`@snort/app`) | Vite |

### Build order (matters — dependencies must build first)

```
shared → system → system-react → wallet → worker-relay → app
```

`system-wasm`, `system-svelte`, and `bot` are not in the root build chain.

## Commands

```bash
bun install                    # Install all workspace deps
bun run build                  # Build all packages in correct order
bun run start                  # Build then start Vite dev server (app)
bun run pre:commit             # Extract/compile i18n + biome lint --write
bunx --bun biome lint --write  # Lint and auto-fix only
bun test                       # Run all tests
bun test packages/system/tests/nip10.test.ts  # Single test file
bun test --test-name-pattern="parseThread"     # Tests by name pattern
```

### Per-package build

```bash
bun --cwd=packages/system run build
bun --cwd=packages/app run build
```

### App dev server with alternate config

```bash
NODE_CONFIG_ENV=iris bun run start   # Uses config/iris.json instead of default.json
```

Configs live in `packages/app/config/` (default, iris, nostr, phoenix, soloco, meku). Selected via `NODE_CONFIG_ENV`.

## CI pipeline order

`bun run build` → `bun test` → `bunx --bun biome lint` (no `--write` in CI)

## Testing

Uses `bun:test` (not jest/vitest). Most tests in `packages/system/tests/`. A few in `packages/app/tests/` and `packages/shared/src/`.

```bash
bun test                                        # All tests
bun test packages/system/tests/nip10.test.ts     # Single file
cd packages/system && bun test                   # Package-scoped
```

Tests use `tsconfig` with `"exclude": ["**/*.test.ts"]` — tests are not compiled by `tsc` build.

## Formatting & Linting

**Biome** (not ESLint/Prettier). Config in `biome.json` at root.

Key settings that differ from defaults:
- Line width: 120
- **Double quotes** for JS/TS (not single — `quoteStyle: "double"`)
- Semicolons: as needed (omit when optional)
- Trailing commas: all
- Arrow parens: as needed
- `useExhaustiveDependencies` rule is **off**
- Imports auto-organized by Biome (`assist.actions.source.organizeImports: "on"`)

## App architecture

- **Path alias**: `@/*` → `./src/*` (in `packages/app`)
- **Config**: `config` npm package, baked into build via `define: { CONFIG: ... }` in Vite
- **Build output**: `packages/app/build/` (not `dist/`)
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin
- **PWA**: `vite-plugin-pwa` with injectManifest strategy, service worker at `src/service-worker.ts`
- **i18n**: react-intl. Extract: `bun --cwd=packages/app run intl-extract`. Compile: `bun --cwd=packages/app run intl-compile`. Source strings → `src/lang.json` → compiled to `src/translations/en.json`

## Nostr patterns

- Event kinds: `packages/system/src/event-kind.ts`
- NIP implementations: `packages/system/src/impl/nip*.ts`
- `EventBuilder` for constructing events
- `NostrLink` for referencing events/profiles
- Tags are arrays: `["e", "eventId", "relay", "marker"]`

## Other directories

- `src-tauri/` — Tauri desktop app (Rust backend), at repo root
- `functions/` — Cloudflare Workers middleware
- `docs/` — VitePress documentation site. Per-package docs in `docs/packages/`. Run with `bunx --bun vitepress dev docs`
- `packages/system-wasm/` — Requires `wasm-pack` to build (Rust → WASM)
