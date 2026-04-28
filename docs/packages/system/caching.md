# Caching

How `@snort/system` caches profiles, relay lists, contact lists, and events.

## Built-in Caches

The system provides three built-in caches, all extending `FeedCache` from `@snort/shared`:

| Cache | Type | Key | Source |
|-------|------|-----|--------|
| `UserProfileCache` | `FeedCache<CachedMetadata>` | pubkey | Kind 0 |
| `UserRelaysCache` | `FeedCache<UsersRelays>` | pubkey | Kind 10002 |
| `UserFollowsCache` | `FeedCache<UsersFollows>` | pubkey | Kind 3 |

### CachedMetadata

```typescript
interface CachedMetadata extends UserMetadata {
  pubkey: string
  created: number  // When the source event was created
  loaded: number   // When the object was saved in cache
}
```

### UsersRelays

```typescript
interface UsersRelays {
  pubkey: string
  created: number
  loaded: number
  relays: FullRelaySettings[]
}
```

### UsersFollows

```typescript
interface UsersFollows {
  pubkey: string
  created: number
  loaded: number
  follows: Array<Array<string>>  // Raw tag arrays
}
```

## FeedCache

The base cache class from `@snort/shared`. Provides in-memory caching with optional persistent storage backend.

### Methods

#### `preload(): Promise<void>`

Load key index from persistent store.

#### `getFromCache(key?: string): T | undefined`

Get from memory cache only (no disk read).

#### `get(key?: string): Promise<T | undefined>`

Get from memory, falling back to persistent store.

#### `bulkGet(keys: string[]): Promise<T[]>`

Bulk get, loading missing from persistent store.

#### `set(obj: T): Promise<void>`

Set in memory and persistent store.

#### `bulkSet(obj: T[]): Promise<void>`

Bulk set in memory and persistent store.

#### `update(m: T & { created: number; loaded: number }): Promise<"new" | "updated" | "refresh" | "no_change">`

Update if newer. Returns the update type:
- `"new"` — didn't exist before
- `"updated"` — source event is newer
- `"refresh"` — same event, reloaded
- `"no_change"` — already up to date

#### `buffer(keys: string[]): Promise<string[]>`

Load keys from persistent store. Returns keys that don't exist on disk.

#### `snapshot(): T[]`

Get a snapshot of all cached data.

#### `subscribe(key: string, cb: () => void): () => void`

Subscribe to changes for a specific key. Returns unsubscribe function. More efficient than the broad `"change"` event.

#### `clear(): Promise<void>`

Clear memory and persistent store.

### Events

| Event | Callback | Description |
|-------|----------|-------------|
| `change` | `(keys: string[]) => void` | Data changed for given keys |
| `update` | `(v: T) => void` | Single entry updated |

### CacheStore

Optional persistent storage backend. Implement `CacheStore<T>` to provide custom storage:

```typescript
interface CacheStore<T> {
  get(key: string): Promise<T | undefined>
  bulkGet(keys: Array<string>): Promise<Array<T>>
  put(obj: T): Promise<void>
  bulkPut(obj: Array<T>): Promise<void>
  delete(key: string): Promise<void>
  bulkDelete(keys: Array<string>): Promise<void>
  clear(): Promise<void>
  keys(): Promise<Array<string>>
}
```

## CacheRelay

A `CacheRelay` is a local relay (typically `@snort/worker-relay`) that stores all events. The system uses it to:

1. Cache incoming events automatically
2. Serve cached results before hitting the network
3. Support negentropy sync

```typescript
interface CacheRelay {
  event(ev: TaggedNostrEvent): Promise<OkResponse>
  query(req: ReqCommand): Promise<TaggedNostrEvent[]>
  delete(req: ReqCommand): Promise<string[]>
}
```

### Setup with worker-relay

```typescript
import { WorkerRelayInterface } from '@snort/worker-relay'

const cachingRelay = new WorkerRelayInterface('/worker.js')

const System = new NostrSystem({
  cachingRelay,
})
```

## Accessing Caches

```typescript
// Profile cache
const profile = System.profileCache.getFromCache('pubkey')
const profileAsync = await System.profileCache.get('pubkey')

// Relay list cache
const relays = System.pool.getConnection('wss://...')

// Subscribe to profile changes
const unsub = System.profileCache.subscribe('pubkey', () => {
  const updated = System.profileCache.getFromCache('pubkey')
  console.log('Profile updated:', updated?.name)
})
// later
unsub()
```

## ProfileLoaderService

The `profileLoader` manages batch-loading of profiles from relays.

### Methods

#### `TrackKeys(keys: string | Array<string>, priority?: ProfilePriority): void`

Mark pubkeys for profile loading. Priority can be `"high"` or `"normal"`.

#### `UntrackKeys(keys: string | Array<string>): void`

Unmark pubkeys (stops loading).

### Priority

```typescript
type ProfilePriority = "high" | "normal"
```

High-priority profiles are loaded first. Use this for visible elements in the viewport.

```typescript
// React integration (automatic via useUserProfile with ref)
const profile = useUserProfile(pubkey, elementRef) // auto-priority

// Manual
System.profileLoader.TrackKeys('pubkey', 'high')
```
