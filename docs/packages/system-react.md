# @snort/system-react

React hooks and components for building Nostr applications.

## Installation

```bash
bun add @snort/system-react
```

## Overview

`@snort/system-react` provides React hooks that integrate with `@snort/system` for reactive Nostr data fetching with built-in caching, SSR support, and automatic subscriptions.

## Setup

Wrap your app with `SnortContext.Provider`:

```typescript
import { SnortContext } from '@snort/system-react'
import { System } from './nostr'

function App() {
  return (
    <SnortContext.Provider value={System}>
      <YourApp />
    </SnortContext.Provider>
  )
}
```

## Core Hooks

### useUserProfile

Fetch and cache a user's profile. Uses `useSyncExternalStore` for efficient re-renders.

```typescript
import { useUserProfile } from '@snort/system-react'
import type { CachedMetadata } from '@snort/system'

function UserProfile({ pubkey }: { pubkey: string }) {
  const profile: CachedMetadata | undefined = useUserProfile(pubkey)

  if (!profile) return <div>Loading...</div>

  return (
    <div>
      <img src={profile.picture} alt={profile.display_name} />
      <h1>{profile.display_name || profile.name}</h1>
      <p>{profile.about}</p>
    </div>
  )
}
```

**With IntersectionObserver (auto-priority):**

```typescript
import { useUserProfile } from '@snort/system-react'
import { useRef } from 'react'

function ProfileCard({ pubkey }: { pubkey: string }) {
  const ref = useRef<HTMLDivElement>(null)
  
  // Automatically tracks visibility and adjusts cache priority
  // Visible elements get "high" priority, off-screen get "normal"
  const profile = useUserProfile(pubkey, ref)

  return <div ref={ref}>{/* Profile content */}</div>
}
```

**Signature:**
```typescript
function useUserProfile(
  pubKey?: string,
  ref?: RefObject<Element | null>
): CachedMetadata | undefined
```

### useRequestBuilder

Send a query to relays and get reactive results.

```typescript
import { useRequestBuilder } from '@snort/system-react'
import { RequestBuilder, EventKind } from '@snort/system'

function Timeline() {
  const rb = useMemo(() => {
    const b = new RequestBuilder('timeline')
    b.withFilter().kinds([EventKind.TextNote]).limit(50)
    return b
  }, [])

  const events = useRequestBuilder(rb)

  return (
    <div>
      {events.map(event => (
        <div key={event.id}>
          <p>{event.content}</p>
        </div>
      ))}
    </div>
  )
}
```

**Signature:**
```typescript
function useRequestBuilder(rb: RequestBuilder): Array<TaggedNostrEvent>
```

Internally this hook:
1. Creates a query via `system.Query(rb)` (memoized)
2. Subscribes to the `event` emitter via `useSyncExternalStore`
3. Calls `q.uncancel()` and `q.start()` on mount
4. Calls `q.cancel()` and `q.flush()` on unmount

### useRequestBuilderAdvanced

Same as `useRequestBuilder` but returns the full `QueryLike` object for manual control.

```typescript
import { useRequestBuilderAdvanced } from '@snort/system-react'
import { RequestBuilder, EventKind } from '@snort/system'

function CustomFeed() {
  const rb = useMemo(() => {
    const b = new RequestBuilder('custom')
    b.withFilter().kinds([EventKind.TextNote])
    return b
  }, [])

  const query = useRequestBuilderAdvanced(rb)

  return (
    <div>
      <p>Progress: {query.progress}</p>
      {query.snapshot.map(event => (
        <div key={event.id}>{event.content}</div>
      ))}
    </div>
  )
}
```

### useEventFeed

Fetch a single event by NostrLink.

```typescript
import { useEventFeed } from '@snort/system-react'
import { NostrLink } from '@snort/system'

function EventView({ link }: { link: NostrLink }) {
  const event = useEventFeed(link) // returns TaggedNostrEvent | undefined

  if (!event) return <div>Loading...</div>
  return <div>{event.content}</div>
}
```

**Signature:**
```typescript
function useEventFeed(link: NostrLink): TaggedNostrEvent | undefined
```

### useEventsFeed

Fetch multiple events by an array of NostrLinks.

```typescript
import { useEventsFeed } from '@snort/system-react'
import { NostrLink } from '@snort/system'

function ThreadView({ links }: { links: NostrLink[] }) {
  const events = useEventsFeed('thread', links)

  return (
    <div>
      {events.map(event => (
        <div key={event.id}>{event.content}</div>
      ))}
    </div>
  )
}
```

**Signature:**
```typescript
function useEventsFeed(id: string, links: Array<NostrLink>): Array<TaggedNostrEvent>
```

### useReactions

Fetch reactions (likes, reposts, zaps) for a set of events.

```typescript
import { useReactions } from '@snort/system-react'

function NoteWithReactions({ event }) {
  const reactions = useReactions("reactions:" + event.id, [NostrLink.fromEvent(event)])
  // ...
}
```

**Signature:**
```typescript
function useReactions(
  subId: string,
  ids: NostrLink | Array<NostrLink>,
  others?: (rb: RequestBuilder) => void,
  leaveOpen?: boolean,
): Array<TaggedNostrEvent>
```

The `others` callback lets you add custom filters to the subscription. **Must be wrapped in `useCallback`** to prevent re-subscriptions.

### useEventReactions

Parse reactions (likes, dislikes, reposts, zaps, etc.) from a pre-fetched set of related events.

```typescript
import { useEventReactions } from '@snort/system-react'

function ReactionsBar({ event, relatedEvents }) {
  const link = NostrLink.fromEvent(event)
  const result = useEventReactions(link, relatedEvents)
  // result.reactions.positive — positive reaction events
  // result.reactions.negative — negative reaction events
  // result.reactions.all — all reaction events
  // result.reposts — repost events
  // result.zaps — parsed zap receipts
  // result.deletions — deletion events
  // result.replies — text note replies
  // result.others — other event kinds grouped by kind
}
```

**Signature:**
```typescript
function useEventReactions(
  link: NostrLink,
  related: ReadonlyArray<TaggedNostrEvent>,
  assumeRelated?: boolean,
): {
  deletions: TaggedNostrEvent[]
  reactions: {
    all: TaggedNostrEvent[]
    positive: TaggedNostrEvent[]
    negative: TaggedNostrEvent[]
  }
  replies: TaggedNostrEvent[]
  reposts: TaggedNostrEvent[]
  zaps: ParsedZap[]
  others: Record<string, TaggedNostrEvent[]>
}
```

This hook does **not** fetch data — it parses a pre-fetched array of related events. Use `useReactions` to fetch, then pass the results to `useEventReactions` for parsing.

### useUserSearch

Search for users by name/npub.

```typescript
import { useUserSearch } from '@snort/system-react'

function SearchComponent() {
  const search = useUserSearch()
  const results = await search('kieran')
  // returns Array<string> of matching pubkeys
}
```

### useCached

Generic cached async-data hook backed by localStorage.

```typescript
import { useCached } from '@snort/system-react'

function MyComponent() {
  const { data, loading, error, reloadNow } = useCached<MyData>(
    'cache-key',          // undefined to disable caching
    () => fetchMyData(),  // async loader
    120,                  // expire time in seconds (default: 120)
    60,                   // cache error duration in seconds (optional)
  )
}
```

### useSystemState

Get reactive system state snapshot.

```typescript
import { useSystemState } from '@snort/system-react'

function SystemStatus() {
  const state = useSystemState(System)

  return (
    <div>
      <p>Active queries: {state.queries.length}</p>
    </div>
  )
}
```

**Signature:**
```typescript
function useSystemState(system: ExternalStore<SystemSnapshot>): SystemSnapshot
```

## Context

### SnortContext

React context providing the `SystemInterface` instance.

```typescript
import { SnortContext } from '@snort/system-react'
import { use } from 'react'

function MyComponent() {
  const system = use(SnortContext)
  
  // Use system directly
  const query = system.Query(rb)
  
  return <div>...</div>
}
```

## SSR Support

`@snort/system-react` has built-in SSR support:

```typescript
import { hydrateSnort, getHydrationScript } from '@snort/system-react'

// Server-side
await System.Init()
const html = renderToString(<App />)
const script = getHydrationScript(System) // returns <script> tag with hydration data

// Client-side (call before React hydration)
hydrateSnort(System)
```

Under the hood:
- `getHydrationScript()` calls `System.getHydrationData()` and serializes it to a `<script>` tag that sets `window.__SNORT_HYDRATION__`
- `hydrateSnort()` reads `window.__SNORT_HYDRATION__` and calls `System.hydrateQuery()` for each entry, then cleans up the global

The `useRequestBuilder` hook eagerly creates queries during SSR, making data available after a `FetchAll()` pass.

## Performance Features

### Automatic Subscription Management

Hooks automatically subscribe/unsubscribe when components mount/unmount.

### Cache Integration

All hooks use the system cache, avoiding duplicate fetches.

### IntersectionObserver Support

`useUserProfile` with `ref` automatically adjusts cache priority based on visibility.

### Per-Key Subscriptions

`useUserProfile` uses O(1) per-key subscription (`profileLoader.cache.subscribe`) instead of listening to the broad `change` event, reducing unnecessary re-renders.

## Debug Components

### TraceTimelineView / TraceTimelineOverlay / TraceStatsView

Debugging components for visualizing query trace timelines.

```typescript
import { TraceTimelineView, TraceStatsView, TraceTimelineOverlay } from '@snort/system-react'
```

## See Also

- [@snort/system](/packages/system) - Core system
- [@snort/shared](/packages/shared) - Utility functions
- [@snort/wallet](/packages/wallet) - Lightning payments
- [Examples → React Hooks](/examples/system-react)
