# NostrSystem

The central orchestrator for all Nostr operations. Manages connections, queries, caching, and event flow.

## Constructor

```typescript
new NostrSystem(config: Partial<SystemConfig>)
```

### SystemConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `relays` | `CachedTable<UsersRelays>` | `UserRelaysCache` | Cache of user relay lists (kind 10002) |
| `profiles` | `CachedTable<CachedMetadata>` | `UserProfileCache` | Cache of user profiles (kind 0) |
| `contactLists` | `CachedTable<UsersFollows>` | `UserFollowsCache` | Cache of contact lists (kind 3) |
| `cachingRelay` | `CacheRelay` | `undefined` | Local cache relay (e.g. `@snort/worker-relay`) |
| `optimizer` | `Optimizer` | `DefaultOptimizer` | Optimized computation functions (e.g. `@snort/system-wasm`) |
| `checkSigs` | `boolean` | `false` | Verify event signatures on receive |
| `automaticOutboxModel` | `boolean` | `true` | Auto-fetch relay lists for authors, write to inbox on broadcast |
| `buildFollowGraph` | `boolean` | `false` | Build social graph from kind 3 events |
| `fallbackSync` | `"since" \| "range-sync"` | `"since"` | Fallback sync when negentropy unavailable |
| `socialGraphInstance` | `SocialGraph` | `new SocialGraph(...)` | Social graph instance for WoT |
| `disableSyncModule` | `boolean` | `false` | Disable negentropy/range-sync |

### Example

```typescript
import { NostrSystem } from '@snort/system'

const System = new NostrSystem({
  checkSigs: true,
  automaticOutboxModel: true,
  buildFollowGraph: true,
})
```

## Lifecycle Methods

### `Init(follows?: string[]): Promise<void>`

Initialize the system. Preloads relay lists, profiles, and contact lists for the given pubkeys.

```typescript
await System.Init(['pubkey1', 'pubkey2'])
```

### `PreloadSocialGraph(follows?: string[], root?: string): Promise<void>`

Preload the social graph from cache. If `buildFollowGraph` is enabled, loads saved graph from localStorage and hydrates from contact list cache.

```typescript
await System.PreloadSocialGraph(['pubkey1'], 'root-pubkey')
```

## Relay Methods

### `ConnectToRelay(address: string, options: RelaySettings): Promise<void>`

Establish a permanent connection to a relay.

```typescript
await System.ConnectToRelay('wss://relay.snort.social', { read: true, write: true })
```

**RelaySettings:**

| Field | Type | Description |
|-------|------|-------------|
| `read` | `boolean` | Subscribe to events from this relay |
| `write` | `boolean` | Publish events to this relay |

### `ConnectEphemeralRelay(address: string): Promise<void>`

Connect to a relay temporarily. Ephemeral connections are automatically closed after inactivity.

```typescript
await System.ConnectEphemeralRelay('wss://relay.example.com')
```

### `DisconnectRelay(address: string): void`

Disconnect from a permanent relay connection.

```typescript
System.DisconnectRelay('wss://relay.example.com')
```

## Query Methods

### `Query(req: RequestBuilder): QueryLike`

Create a persistent query subscription. See [Query System](/packages/system/queries) for details.

```typescript
const q = System.Query(rb)
q.on('event', (events) => console.log(events))
```

### `Fetch(req: RequestBuilder, cb?: (evs: TaggedNostrEvent[]) => void): Promise<TaggedNostrEvent[]>`

Fetch events asynchronously. Returns when all relays report EOSE. Optional callback fires every ~300ms with new events.

```typescript
const events = await System.Fetch(rb, (batch) => {
  console.log('Partial result:', batch.length)
})
console.log('Final result:', events.length)
```

### `FetchAll(): Promise<void>`

Wait for all active queries to reach EOSE. Useful for SSR: render once to discover queries, `FetchAll()`, then re-render.

### `GetQuery(id: string): QueryLike | undefined`

Get an active query by its ID.

## Event Methods

### `BroadcastEvent(ev: NostrEvent, cb?: (rsp: OkResponse) => void): Promise<OkResponse[]>`

Broadcast an event to all permanent write relays. If `automaticOutboxModel` is enabled, also writes to inbox relays for all `p`-tagged users.

```typescript
const responses = await System.BroadcastEvent(signedEvent, (rsp) => {
  console.log(`${rsp.ok ? 'OK' : 'FAIL'} from ${rsp.relay}`)
})
```

### `WriteOnceToRelay(address: string, ev: NostrEvent): Promise<OkResponse>`

Send an event to a specific relay and wait for the response.

```typescript
const response = await System.WriteOnceToRelay('wss://relay.example.com', signedEvent)
```

### `HandleEvent(subId: string, ev: TaggedNostrEvent): void`

Inject an event from an external source into the system. Useful for SSR hydration or testing.

## SSR Methods

### `hydrateQuery(id: string, events: TaggedNostrEvent[]): void`

Hydrate a query with pre-fetched events (client-side after SSR).

### `getHydrationData(): Record<string, TaggedNostrEvent[]>`

Get all query data for SSR transfer.

```typescript
// Server
const data = System.getHydrationData()
// Send data to client...

// Client
for (const [id, events] of Object.entries(data)) {
  System.hydrateQuery(id, events)
}
```

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `config` | `SystemConfig` | System configuration |
| `profileLoader` | `ProfileLoaderService` | Profile loading and caching service |
| `pool` | `ConnectionPool` | Relay connection pool |
| `relayLoader` | `RelayMetadataLoader` | Loads relay metadata for pubkeys |
| `requestRouter` | `RequestRouter \| undefined` | Routes requests to best relays (outbox) |
| `traceTimeline` | `TraceTimeline` | Debug/performance tracing |
| `profileCache` | `CachedTable<CachedMetadata>` | Profile cache |
| `userFollowsCache` | `CachedTable<UsersFollows>` | Contact list cache |
| `optimizer` | `Optimizer` | Computation optimizer |
| `cacheRelay` | `CacheRelay \| undefined` | Local cache relay |
| `checkSigs` | `boolean` | Whether to verify signatures (read/write) |

## Events

NostrSystem extends `EventEmitter<NostrSystemEvents>`:

| Event | Callback | Description |
|-------|----------|-------------|
| `change` | `(state: SystemSnapshot) => void` | System state changed |
| `auth` | `(challenge: string, relay: string, cb: (ev) => void) => void` | Relay requesting NIP-42 auth |

### NIP-42 Auth Example

```typescript
System.on('auth', async (challenge, relay, cb) => {
  const publisher = EventPublisher.privateKey(privateKey)
  const authEvent = await publisher.nip42Auth(challenge, relay)
  cb(authEvent)
})
```
