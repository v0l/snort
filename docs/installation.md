# Installation

## Prerequisites

- **Node.js** 18+ or **Bun** 1.0+
- TypeScript 5.0+ (if using TypeScript)

## Package Manager

We recommend using **Bun** for the best experience, but npm and yarn work too:

```bash
# Using Bun (recommended)
bun add @snort/system

# Using npm
npm install @snort/system

# Using yarn
yarn add @snort/system
```

## Core Packages

### Minimal Setup (Just the core)

```bash
bun add @snort/system
```

### React Application

```bash
bun add @snort/system @snort/system-react @snort/shared
```

### Full Stack (With Wallet)

```bash
bun add @snort/system @snort/system-react @snort/shared @snort/wallet
```

### All Packages

```bash
bun add @snort/system @snort/system-react @snort/shared @snort/wallet @snort/worker-relay
```

## Available Packages

| Package | Description | Size |
|---------|-------------|------|
| `@snort/system` | Core Nostr system | ~45kb |
| `@snort/system-react` | React hooks & components | ~15kb |
| `@snort/shared` | Utility functions | ~10kb |
| `@snort/wallet` | Lightning wallet integration | ~8kb |
| `@snort/worker-relay` | Service worker relay | ~12kb |
| `@snort/bot` | Bot framework | ~6kb |
| `@snort/system-wasm` | WebAssembly optimizations | ~25kb |
| `@snort/system-svelte` | Svelte bindings | ~10kb |

## TypeScript Configuration

Ensure your `tsconfig.json` has:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

## Next Steps

- [Quick Start](/quick-start) - Get up and running in 5 minutes
- [Package Docs](/packages/system) - Detailed package documentation
