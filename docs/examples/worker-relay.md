# @snort/worker-relay Examples

Real-world usage of `WorkerRelayInterface` from the Snort app.

## Initialization with search index configuration

The app configures full-text search on kind 1 events and handles the Vite dev/production worker loading pattern:

```typescript
// Cache/index.ts
const workerRelay = hasWasm
  ? new WorkerRelayInterface(
      import.meta.env.DEV
        ? new URL("@snort/worker-relay/dist/esm/worker.mjs", import.meta.url)
        : new WorkerVite(),
    )
  : undefined

export async function initRelayWorker() {
  try {
    if (workerRelay) {
      await workerRelay.debug("*")
      await workerRelay.init({
        databasePath: "relay.db",
        insertBatchSize: 100,
      })
      await workerRelay.configureSearchIndex({
        1: [],  // full-text search index for kind 1, don't index tags
      })
    }
  } catch (e) {
    console.error(e)
  }
}
```

## forYouFeed() for personalized recommendations

The ML-powered feed runs entirely against the local SQLite database — no network round-trips:

```typescript
// ForYouTab.tsx
const getFeed = useCallback(() => {
  if (!login.publicKey) return []
  if (!getForYouFeedPromise && Relay instanceof WorkerRelayInterface) {
    getForYouFeedPromise = Relay.forYouFeed(login.publicKey)
  }
  getForYouFeedPromise?.then(notes => {
    getForYouFeedPromise = null
    if (notes.length < 10) {
      setTimeout(() => {
        if (Relay instanceof WorkerRelayInterface) {
          getForYouFeedPromise = Relay.forYouFeed(login.publicKey!)
        }
      }, 1000)
    }
    setNotes(notes)
  })
}, [login.publicKey])
```

## setEventMetadata for tracking seen_at

Mark when a user sees an event (debounced to avoid excessive writes):

```typescript
// Note.tsx
useEffect(() => {
  let timeout: ReturnType<typeof setTimeout>
  if (setSeenAtInView && Relay instanceof WorkerRelayInterface) {
    const r = Relay as WorkerRelayInterface
    timeout = setTimeout(() => {
      r.setEventMetadata(ev.id, { seen_at: Math.round(Date.now() / 1000) })
    }, 1000)
  }
  return () => clearTimeout(timeout)
}, [setSeenAtInView, ev.id])
```

## count() for reply counts from cache

Avoid a full relay subscription by counting replies in the local cache:

```typescript
// NoteFooter.tsx
useEffect(() => {
  const cacheRelay = system.cacheRelay
  if (cacheRelay instanceof WorkerRelayInterface && !props.replyCount) {
    const fx = new RequestFilterBuilder()
      .kinds([EventKind.TextNote, EventKind.Comment])
      .replyToLink([link])
    cacheRelay.count(["REQ", "", fx.filter]).then(setReplyCount)
  }
}, [system, link, props.replyCount])
```

## Admin UI: summary, wipe, and dump

```typescript
// Cache.tsx
useEffect(() => {
  if (Relay instanceof WorkerRelayInterface) {
    Relay.summary().then(setCounts)              // event counts by kind
    if (login.publicKey) {
      Relay.count(["REQ", "my", { authors: [login.publicKey] }]).then(setMyEvents)
    }
  }
}, [login.publicKey])

// Wipe the database:
await Relay.wipe()

// Dump the database:
const data = Relay instanceof WorkerRelayInterface ? await Relay.dump() : undefined
```
