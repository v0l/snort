# SSR (Server-Side Rendering) Setup

## Overview

This app uses a **hybrid SSR approach** with a persistent NostrSystem instance:

- **Real data**: Fetches Nostr profiles and notes from relays via WebSocket during SSR
- **Helmet async**: Uses `react-helmet-async` with `HelmetProvider` to capture SEO tags server-side
- **Hydration**: Helmet state is serialized to the client for seamless hydration
- **Route-specific SEO**: `/p/:id` profiles render with profile names, about text, and structured data. `/e/:id` threads render with note content and author info.

## Development

### Start SSR dev server (with HMR)

```bash
bun run dev:ssr
```

This starts an Express server with Vite in middleware mode. Changes to your code will hot-reload.

**Access:** http://localhost:3000

### Test production build locally

```bash
# Build both client and server bundles
bun run build:ssr

# Start the production SSR server
bun run serve:ssr
```

**Access:** http://localhost:3000 (or `PORT=8080 bun run serve:ssr`)

## Build Scripts

| Script | Description |
|--------|-------------|
| `bun run build` | Build SPA (client-only) |
| `bun run build:ssr` | Build SSR bundles (client + server) |
| `bun run build:all` | Build both SPA and SSR |
| `bun run dev:ssr` | Start SSR dev server |
| `bun run serve:ssr` | Start production SSR server |

## Architecture

### Dev Server (`server/dev.ts`)

- Express + Vite middleware mode
- Loads `entry-server.tsx` via Vite's SSR loader (always fresh)
- Injects SSR output into `index.html` with route-specific SEO tags
- Swaps SPA entry script for SSR client entry for hydration

### Prod Server (`server/prod.ts`)

- Bun.serve with static asset serving from `build/client/`
- Loads pre-built server bundle from `build/server/`
- Caches SSR module (loaded once, reused across requests)

### Entry Points

- **`entry-server.tsx`** — Server-side render function with NostrSystem data fetching
- **`entry-client.tsx`** — Client-side hydration entry point with HelmetProvider
- **`routes.tsx`** — Shared route definitions

### Data Flow

1. Request comes in (e.g. `/p/npub1abc...`)
2. `render()` in `entry-server.tsx` is called with the URL
3. A persistent `NostrSystem` instance (created on first request) connects to configured relays
4. For `/p/:id`: `System.Fetch()` kind 0 events filtered by author pubkey
5. For `/e/:id`: `System.Fetch()` kind 1 events filtered by note ID, then fetch author profile
6. Data is passed to React components rendered with `HelmetProvider`
7. `HelmetData.context` is extracted for client-side hydration
8. The SSR title **replaces** the template `<title>` tag (search engines use the first title)

### NostrSystem Configuration (SSR)

| Setting | Value | Reason |
|---------|-------|--------|
| `automaticOutboxModel` | `false` | Target relays directly without outbox routing |
| `buildFollowGraph` | `false` | Not needed for SSR request/response |
| `disableSyncModule` | `true` | Plain REQ is simpler than negentropy for SSR |
| `checkSigs` | `false` | Avoid WASM dependency in SSR context |

The system uses in-memory caches only — no IndexedDB, localStorage, or OPFS.

### Relay Connections

The SSR NostrSystem connects to all `defaultRelays` from config that have `read: true`. Connections are **persistent across requests** for better performance (no reconnect overhead per page load).

## SEO Features

### Profiles (`/p/:id`)

- `<title>`: `Display Name on Snort` (or `Display Name (nip05) on Snort`)
- `<meta name="description">`: Profile about text (truncated to 160 chars)
- `og:title`, `og:description`, `og:image`: Open Graph tags for link previews
- `twitter:title`, `twitter:description`, `twitter:image`: Twitter Card tags
- JSON-LD structured data (`Person` schema) when profile has a picture
- HTML content: Profile card with banner, avatar, display name, NIP-05, about text

### Events (`/e/:id`)

- `<title>`: `Author Name on Snort`
- `<meta name="description">`: Note content (truncated to 160 chars, markdown stripped)
- Full set of OG and Twitter Card meta tags
- HTML content: Note card with author avatar, name, NIP-05, timestamp, full content text

### Other Routes

- Default template `<title>` and meta tags from `index.html`
- Canonical URL and `robots: index, follow`

## Health Check

Both dev and prod servers expose a `/health` endpoint:

```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"2026-01-15T12:34:56.789Z"}
```

## Troubleshooting

### Build errors

If you see module resolution errors:

```bash
# Clean and reinstall
rm -rf node_modules .bun/install
bun install
```

### SSR not working

Check that you built both bundles:

```bash
bun run build:ssr
```

### Port already in use

```bash
PORT=8080 bun run dev:ssr
```

### Relay connection issues

The SSR system connects to all configured `defaultRelays` with `read: true`. If relay connections fail, profiles/notes will show skeleton placeholders instead of real data (graceful degradation).

### Slow SSR responses

The NostrSystem uses `System.Fetch()` with a 30-second timeout. If relays are slow, consider removing slow relays from `defaultRelays` in config.

## Files

```
packages/app/
├── server/
│   ├── dev.ts        # SSR dev server (Express + Vite)
│   └── prod.ts       # SSR prod server (Bun.serve)
├── src/entry/
│   ├── entry-server.tsx  # SSR render function with NostrSystem
│   ├── entry-client.tsx  # Client hydration entry
│   ├── ssr-mock.ts       # Browser API mocks for SSR
│   └── routes.tsx        # Shared routes
├── index.html          # HTML template (SSR outlet)
├── vite.config.ts      # Vite config (SPA + SSR builds)
└── SSR.md              # This file
```
