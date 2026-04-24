# Server-Side Rendering (SSR) with @snort/system

## Overview

This guide explains how to use `@snort/system` and `@snort/system-react` for server-side rendering with React.

## The Problem

`useRequestBuilder` hooks fire async queries to Nostr relays. During SSR, `renderToString` is synchronous and doesn't wait for data to arrive. This results in:
1. Empty HTML being rendered
2. Client-side hydration needing to re-fetch all data

## The Solution

Use a **two-pass render pattern** with `system.FetchAll()`:

1. **First render**: Trigger all `useRequestBuilder` hooks to create queries
2. **FetchAll**: Await all queries to reach EOSE
3. **Second render**: Render with populated data
4. **Hydration script**: Inject fetched data for client hydration

## Implementation

### 1. Setup

```tsx
// server/ssr-render.tsx
import { renderToString } from "react-dom/server";
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from "react-router-dom";
import { NostrSystem } from "@snort/system";
import { SnortContext } from "@snort/system-react";
import { getHydrationScript } from "./hydration";
import { routes } from "./routes";

const system = new NostrSystem({});
const relayConnect = system.ConnectToRelay("wss://relay.example.com", { read: true });

export async function renderPage(url: string, template: string) {
  await relayConnect;

  const handler = createStaticHandler(routes);
  const context = await handler.query(new Request(`http://localhost${url}`));
  const router = createStaticRouter(handler.dataRoutes, context);

  // Pass 1: Trigger query subscriptions
  renderToString(
    <SnortContext.Provider value={system}>
      <StaticRouterProvider router={router} context={context} />
    </SnortContext.Provider>,
  );

  // Wait for all queries to complete
  await system.FetchAll();

  // Pass 2: Render with populated data
  const html = renderToString(
    <SnortContext.Provider value={system}>
      <StaticRouterProvider router={router} context={context} />
    </SnortContext.Provider>,
  );

  // Inject hydration data for client
  const hydrationScript = getHydrationScript(system);
  return template.replace('<!--app-html-->', html).replace('</head>', `${hydrationScript}</head>`);
}
```

### 2. Client Hydration

```tsx
// src/entry-client.tsx
import { hydrateRoot } from "react-dom/client";
import { hydrateSnort } from "./hydration";
import { System } from "./system";

// Restore data from server
hydrateSnort(System);

// Hydrate React tree
hydrateRoot(
  document.getElementById("root")!,
  <SnortContext.Provider value={System}>
    <RouterProvider router={router} />
  </SnortContext.Provider>,
);
```

### 3. Hydration Utilities

```tsx
// src/hydration.ts
import type { SystemInterface, TaggedNostrEvent } from "@snort/system";

export function getHydrationScript(system: SystemInterface): string {
  const data = system.getHydrationData();
  if (Object.keys(data).length === 0) return "";
  return `<script>window.__SNORT_HYDRATION__ = ${JSON.stringify(data)}</script>`;
}

export function hydrateSnort(system: SystemInterface) {
  if (typeof window !== "undefined" && window.__SNORT_HYDRATION__) {
    for (const [id, events] of Object.entries(window.__SNORT_HYDRATION__)) {
      system.hydrateQuery(id, events);
    }
    delete (window as any).__SNORT_HYDRATION__;
  }
}
```

## How It Works

1. **First render**: `useRequestBuilder` hooks call `system.Query(rb)` which registers queries in the QueryManager
2. **FetchAll**: Waits for the first relay EOSE per query, then allows a 500ms grace period for other relays before resolving. Slow relays that haven't responded are timed out. (Hard timeout: 30s)
3. **Second render**: `useRequestBuilder` hooks now find populated snapshots via `system.GetQuery(rb.id)?.snapshot`
4. **Hydration**: Client reads `window.__SNORT_HYDRATION__` and calls `hydrateQuery` to restore query state

## API Reference

### `system.FetchAll(): Promise<void>`

Relays race: waits for the first trace on each query to reach EOSE, then
allows a 500ms grace period for other relays to respond before resolving.
Slow relays that haven't responded are timed out. Skips queries marked with
`leaveOpen: true`. Hard timeout: 30s per query.

```typescript
await system.FetchAll();
```

### `system.getHydrationData(): Record<string, TaggedNostrEvent[]>`

Returns all query data suitable for serialization.

```typescript
const data = system.getHydrationData();
// { "query-id-1": [...events], "query-id-2": [...] }
```

### `system.hydrateQuery(id: string, events: TaggedNostrEvent[]): void`

Injects pre-fetched events into a query.

```typescript
system.hydrateQuery("query-id-1", eventsFromServer);
```

## Notes

- **Timeout**: Hard timeout of 30s per query, but in practice `FetchAll()` resolves after first-EOSE + 500ms grace period
- **LeaveOpen queries**: Queries with `leaveOpen: true` are skipped by `FetchAll()`
- **Relay connections**: Ensure relays are connected before calling `FetchAll()`
- **First request**: The first SSR request may be slower as relays establish WebSocket connections

## Version

Added in `@snort/system@2.0.1` and `@snort/system-react@2.0.1`
