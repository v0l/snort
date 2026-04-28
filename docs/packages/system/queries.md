# Query System

How to build, send, and subscribe to Nostr queries using `RequestBuilder`, `Query`, and `NoteCollection`.

## RequestBuilder

Fluent API for constructing Nostr filter requests.

### Constructor

```typescript
const rb = new RequestBuilder('unique-id')
```

The ID should be unique to the use case. All data fetched with the same ID is merged into the same store.

### Adding Filters

#### `withFilter(): RequestFilterBuilder`

Add a new filter. Multiple filters use OR logic.

```typescript
const rb = new RequestBuilder('feed')
  .withFilter()
    .kinds([EventKind.TextNote])
    .authors(['pubkey1', 'pubkey2'])
    .limit(50)
    .since(Math.floor(Date.now() / 1000) - 3600)
```

#### `withBareFilter(f: ReqFilter): RequestFilterBuilder`

Add a raw filter object.

```typescript
rb.withBareFilter({ kinds: [1], limit: 10 })
```

### Options

#### `withOptions(opt: RequestBuilderOptions): this`

| Option | Type | Description |
|--------|------|-------------|
| `leaveOpen` | `boolean` | Don't send CLOSE after EOSE, keep streaming |
| `outboxPickN` | `number` | Pick N relays per pubkey with outbox model |
| `groupingDelay` | `number` | Wait time (ms) to group similar requests |
| `replaceable` | `boolean` | Replace query when changes detected (e.g. live chat) |
| `skipCache` | `boolean` | Skip the cache relay |
| `useSyncModule` | `boolean` | Enable negentropy/range-sync |
| `extraEvents` | `NostrEvent[]` | Extra events to include in the store |

```typescript
rb.withOptions({
  leaveOpen: true,
  replaceable: true,
  outboxPickN: 3,
})
```

### Relay Targeting

#### `withRelays(relays: string[]): this`

Force all filters to use specific relays.

```typescript
rb.withRelays(['wss://relay.snort.social', 'wss://nos.lol'])
```

### Combining Builders

#### `add(other: RequestBuilder): void`

Merge another builder's filters into this one.

```typescript
const rb1 = new RequestBuilder('part1')
rb1.withFilter().authors(['pubkey1']).kinds([1])

const rb2 = new RequestBuilder('part2')
rb2.withFilter().authors(['pubkey2']).kinds([1])

rb1.add(rb2)
```

## RequestFilterBuilder

Builder for individual filters within a request.

### Methods

#### `relay(url: string | string[]): this`

Target specific relay(s) for this filter.

```typescript
rb.withFilter().relay('wss://relay.example.com').kinds([1])
```

#### `ids(ids: string[]): this`

Filter by event IDs.

```typescript
rb.withFilter().ids(['event-id-1', 'event-id-2'])
```

#### `authors(authors: string[]): this`

Filter by pubkeys (hex, 64 chars).

```typescript
rb.withFilter().authors(['hex-pubkey-1', 'hex-pubkey-2'])
```

#### `kinds(kinds: EventKind[]): this`

Filter by event kinds.

```typescript
rb.withFilter().kinds([EventKind.TextNote, EventKind.LongFormTextNote])
```

#### `since(timestamp: number): this`

Filter events created after timestamp.

```typescript
rb.withFilter().since(Math.floor(Date.now() / 1000) - 86400) // last 24h
```

#### `until(timestamp: number): this`

Filter events created before timestamp.

```typescript
rb.withFilter().until(Math.floor(Date.now() / 1000))
```

#### `limit(count: number): this`

Limit number of results.

```typescript
rb.withFilter().limit(50)
```

#### `tag(key: string, values: string[]): this`

Filter by tag. Supports `e`, `p`, `d`, `t`, `r`, `a`, `g`, and any custom tag key.

```typescript
rb.withFilter().tag('e', ['event-id'])        // Events referencing event-id
rb.withFilter().tag('p', ['pubkey'])           // Events referencing pubkey
rb.withFilter().tag('d', ['identifier'])       // Replaceable event identifier
rb.withFilter().tag('t', ['bitcoin', 'nostr']) // Hashtags
```

#### `tags(tags: ToNostrEventTag[]): this`

Add multiple tag filters from `ToNostrEventTag` objects.

```typescript
const links = [NostrLink.publicKey('pubkey1'), NostrLink.publicKey('pubkey2')]
rb.withFilter().tags(links)
```

#### `search(keyword: string): this`

Full-text search (requires relay support, NIP-50).

```typescript
rb.withFilter().search('bitcoin lightning')
```

#### `link(link: NostrLink | ToNostrEventTag): this`

Filter by a `NostrLink` or `ToNostrEventTag`. Handles note, event, profile, and address links.

```typescript
const link = NostrLink.fromEvent(event)
rb.withFilter().link(link)
```

#### `replyToLink(links: NostrLink[]): this`

Filter for replies to the given links (using `e` or `a` tags).

```typescript
const rootLink = NostrLink.fromEvent(rootEvent)
rb.withFilter().replyToLink([rootLink])
```

## Query

When you call `System.Query(rb)`, you get a `QueryLike` object.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `progress` | `number` | Query progress (0-1) |
| `snapshot` | `TaggedNostrEvent[]` | Current event snapshot |

### Methods

| Method | Description |
|--------|-------------|
| `cancel()` | Mark query for cancellation |
| `uncancel()` | Un-mark query for cancellation |
| `start()` | Start the query request flow |
| `flush()` | Flush buffered data to listeners |

### Events

| Event | Callback | Description |
|-------|----------|-------------|
| `event` | `(events: TaggedNostrEvent[]) => void` | New events received (batched ~300ms) |
| `eot` | `() => void` | End of stored events (all relays EOSE) |

### Example

```typescript
const rb = new RequestBuilder('profile')
  .withFilter().kinds([EventKind.SetMetadata]).authors(['pubkey1'])

const q = System.Query(rb)

// Listen for events
q.on('event', (events) => {
  events.forEach(ev => {
    const profile = JSON.parse(ev.content)
    console.log(profile.name, profile.about)
  })
})

// Listen for completion
q.on('eot', () => {
  console.log('All stored events loaded')
})

// Cancel when done
setTimeout(() => q.cancel(), 10000)
```

## NoteCollection

Event store that manages received events with deduplication and sorting.

### Types

```typescript
type NoteStoreSnapshotData = Array<TaggedNostrEvent>
```

### Built-in Collections

The `Query` uses a `NoteCollection` internally which:

- Deduplicates events by ID
- Sorts by `created_at` descending
- Handles replaceable events (keeps latest)
- Handles parameterized replaceable events (keeps latest per `d` tag)
- Buffers emissions (~300ms) to reduce re-renders

## QueryManager

Internal system that manages all active queries. Access via `System` methods.

### Query Trace States

```typescript
enum QueryTraceState {
  NEW = "NEW",             // Not yet used
  QUEUED = "QUEUED",       // First created
  WAITING = "WAITING",     // Sent REQ, will close on EOSE
  WAITING_STREAM = "WAITING_STREAM", // Streaming, stay open after EOSE
  SYNC_WAITING = "SYNC_WAITING",     // Waiting for NEG-OPEN response
  SYNC_FALLBACK = "SYNC_FALLBACK",   // SYNC not supported, fallback to REQ
  EOSE = "EOSE",           // Server reported end of stored events
  LOCAL_CLOSE = "LOCAL_CLOSE",       // We sent close
  REMOTE_CLOSE = "REMOTE_CLOSE",     // Server closed the request
  DROP = "DROP",           // Dropped due to disconnect
  TIMEOUT = "TIMEOUT",     // Closed due to timeout
}
```

## Complete Example

```typescript
import { NostrSystem, RequestBuilder, EventKind } from '@snort/system'

const System = new NostrSystem({})
await System.Init()
await System.ConnectToRelay('wss://relay.snort.social', { read: true })

// Build a complex query
const rb = new RequestBuilder('home-timeline')
  .withOptions({ leaveOpen: true })

// Follows' text notes
rb.withFilter()
  .authors(followList)
  .kinds([EventKind.TextNote])
  .since(lastCheck)
  .limit(100)

// Global trending (separate filter = OR logic)
rb.withFilter()
  .kinds([EventKind.TextNote])
  .tag('t', ['nostr'])
  .limit(20)

const q = System.Query(rb)

q.on('event', (events) => {
  // Called every ~300ms with new events
  updateFeed(events)
})

q.on('eot', () => {
  // All relays have reported EOSE
  setLoading(false)
})
```

## See Also

- [Examples → Query System](/examples/queries)
