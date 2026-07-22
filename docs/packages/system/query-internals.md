# Query System Internals & Performance

How `@snort/system` executes queries end-to-end, what the hot paths are, how the cache relay
participates, and the real-world filter shapes the design must serve. This page documents the
system as it is — including constraints discovered while profiling — and closes with design
notes for future optimization work.

## Event flow

```
RequestBuilder ──► QueryManager.query() ──► Query (feed: NoteCollection)
                        │                      │
                        │ #send()              │ traces (QueryTrace per relay REQ)
                        ▼                      ▼
              cacheRelay.query()        trace routing table (subId → Query)
                        │                      ▲
                        ▼                      │ single pool "event" listener
             optimizer.compress() ──► per-relay REQ ──► Connection (WebSocket)
                        ▲
              requestRouter (OutboxModel) — splits filters per relay
```

Key mechanics:

- **One pool-level event listener.** `QueryManager` maintains a routing table
  (`subscription id → Query`) and dispatches every incoming event with a single `Map` lookup.
  Listeners do not grow with the number of active queries or traces.
- **Per-connection `eose`/`closed` listeners are attached once** per connection object, not per
  trace. Subscription slots freed by EOSE/CLOSED trigger a retry of queued traces.
- **Signature verification is batched.** Events arriving in the same microtask turn are verified
  in one `batchVerify` call (amortizes the JS→WASM boundary).
- **Feeds are lazy.** `NoteCollection` invalidates its snapshot on write and only materializes it
  when read; emits are debounced (300&nbsp;ms window).
- **Filter matching is compiled.** `eventMatchesFilter` compiles each `ReqFilter` to Set-based
  matchers (cached in a `WeakMap`), so author lists with thousands of entries match in O(1) per
  event. Tag filters (`#e`, `#p`, …) are enforced.
- **Queries are deduplicated by `RequestBuilder.id`.** The same id reuses the existing `Query`
  and its feed; filters already sent are not re-sent (`areFiltersCovered`).

## Query lifecycle timers

| Timer | Default | Purpose |
|---|---|---|
| `groupingDelay` | 100&nbsp;ms | Debounce window to batch filters before sending |
| grace period | 500&nbsp;ms | After first trace EOSE, time out stragglers (`FetchAllGracePeriod`) |
| hard timeout | 30&nbsp;s | Query never hangs if no relay answers (`QueryFetchTimeout`) |
| `keepAlive` | 0 (1&nbsp;s cleanup) | How long a query survives after its last subscriber detaches |

## Cache relay integration

The cache participates in two places:

**Read path** — `QueryManager.#send()` queries the cache *before* the network:

1. `cacheRelay.query(filters)` → results added to the feed immediately (fast first paint).
2. Fully-satisfied `ids` filters are elided — no relay REQ is sent for them.
3. Cached results optionally seed the sync module (`syncFrom`) when `useSyncModule` is enabled.

**Write path** — every event received from any relay is written to the cache
(`pool.on("event") → cachingRelay.event(ev)`). The worker batches writes into 50&nbsp;ms
transactions and replies optimistically.

### Cache availability tiers

The cache relay is **not always available**. OPFS and WASM restrictions (private browsing,
older browsers, non-secure contexts) force degradation, and every cache feature must be
strictly optional:

| Tier | Storage | Durability | Notes |
|---|---|---|---|
| `SqliteRelay` | SQLite (WASM) on OPFS | persistent | Preferred; FTS5 search, tag/kind/pubkey indexes |
| `InMemoryRelay` | in-memory | session only | Automatic fallback when WASM/OPFS unavailable |
| `ConnectionCacheRelay` | external relay over WebSocket | remote | User-configured `cache-relay` URL |
| none | — | — | `#send` skips the cache path entirely |

**Design rule:** any state that claims "we already have this data" (e.g. sync watermarks) must
live *inside the same store as the events*, with the same lifetime. Storing such state
elsewhere (e.g. `localStorage` while events live in OPFS) risks permanent data gaps when one
store is wiped and the other survives.

## Sync modules and why negentropy is off by default

Three delta-sync mechanisms exist (`useSyncModule: true` per query, used sparingly — currently
only NIP-17 DMs):

| Mechanism | How | Constraint |
|---|---|---|
| Negentropy (NIP-77) | set reconciliation, near-optimal bandwidth | relay support unreliable |
| `since` fallback | `since = newest cached + 1` | append-only assumption |
| `RangeSync` | windowed time-range scans | bulk backfill tool |

**Negentropy is disabled by default because NIP-11 advertisements are unreliable.** Relays
advertise support but have it disabled or return errors, so a NEG-OPEN-first strategy makes
*every query* pay a failed round-trip before falling back to a plain REQ. Lesson:

> Never negotiate protocol capability on the query's critical path. Remember *observed*
> capability per relay (worked / failed), and probe off the critical path if at all.

## Outbox model: filter shapes are unstable by design

With `automaticOutboxModel` (the default in Snort), filters are rewritten before sending:

1. `OutboxModel.forRequest` splits an `authors` (or `#p`) filter into per-relay subsets based on
   each author's relay list — and the relay pick is **randomized** per session.
2. The query optimizer (`expandFilter` → `flatMerge`) regroups and compresses filters, with
   results depending on whatever else is in flight.

Consequently **composed filter content is not a stable identity**. Any cache/sync state keyed
on a hash of the compressed filter will practically never match twice. Stable identities in
this system are:

- `RequestBuilder.id` — app-chosen, semantic (`"timeline:pubkey:<id>"`, `"login:sub"`), already
  used as the query dedup key
- the **pre-routing** filter (what the app asked for, before outbox/compression)
- atomic coordinates like `(pubkey, kind)` — an author's timeline doesn't depend on which of
  their write relays served it

## Filter shape corpus

Survey of all `RequestBuilder` construction sites in `packages/app` + system internals
(~45 sites). The system must serve *all* of these shapes — notably, **tag-discriminated
filters are the most common shape by site count**, and per-note reaction queries are the most
frequent at runtime. Author-based filters are the heaviest per query (follow lists), not the
most common.

| Shape | Sites | Examples | Runtime frequency |
|---|---|---|---|
| `kinds` + tag (`#e` `#a` `#p` `#t` `#d` `#g` `#k` `#P`) | ~18 | reactions/zaps per note (`replyToLink` → `#e`/`#a`), thread replies, hashtag feeds, notifications (`#p`), giftwrap DMs (`#p`), live chat (`#a`), app handlers (`#k`), relay monitors (`#d`, `#g`) | **highest** — reaction queries fire per visible note batch |
| `kinds` + `authors` | ~15 | follows timeline, articles, profile/relay/contact list loaders, statuses | heavy payloads (follow lists ≫ 100 authors) |
| `ids` / `link()` | ~6 | thread roots, quoted notes, event fetch | high (navigation) |
| `kinds` only (global) | ~4 | live streams, follow sets, media servers | low, often relay-pinned |
| `search` | 2 | keyword/profile search | low, pinned to search relays |
| mixed (`authors` + tag) | 2+ | subscriptions (`authors`+`#p`), rates (`authors`+`#d`) | low |

Additional observations:

- Many filters carry explicit `relays` pinning (search relays, live streams, `login:sub`).
- `since`/`until`/`limit` are added dynamically by timeline windowing (`useTimelineWindow`), so
  the same logical query changes time bounds continuously.
- `ids` and `search` filters are not meaningfully delta-syncable; tag- and author-discriminated
  filters are.

## Sync coverage (watermarks)

*Implemented* in `query-sync.ts` + `QueryManager.#applySyncCoverage`, gated on the cache relay
exposing the optional `syncState` capability (`CacheRelay.syncState`).

How it works:

1. **Keyed on stable identity, applied pre-routing.** State is stored per
   `sync:<RequestBuilder.id>:<dimension>:<kinds>` and applied to the pre-routing filter,
   *before* the outbox model and optimizer reshape it — immune to the filter instability
   described above.
2. **Dimension diff.** The single diffable array dimension (`authors` or one `#x` tag) is
   split into *known* values (present in stored state) and *fresh* values (follow-list
   additions etc.). Fresh values get a full fetch; known values get:
   - **fully covered** requested window → no relay REQ at all (cache already served it)
   - window extending above coverage → **delta** `since: coveredUntil − overlap` (5 min)
   - superset of coverage (no `since`) → **split** around the covered window (below + above)
   - pagination below coverage → sent unchanged
3. **EOSE-proven advancement.** Watermarks only advance when the query reaches EOSE.
   `limit`-truncated responses only prove the window down to the limit-th newest matched
   event; windows proven for the same value-set union, windows of different value subsets
   intersect (no over-claim for values proven in a narrower range).
4. **Eligibility.** Requires `kinds` + at most one array dimension. `ids`, `search`,
   mixed-dimension filters (e.g. `authors`+`#p`) and unreliable-timestamp kinds (gift wraps)
   are excluded. `skipCache` queries bypass entirely.
5. **Storage tiers.** `WorkerRelayInterface.syncState` persists to a `kv` table in the same
   SQLite database as the events (wiped together by `wipe()`); the in-memory fallback keeps
   session-scoped state. Cache tiers without `syncState` degrade to exactly the previous
   behavior.

## Design notes for future work

These are *not implemented*; they record conclusions from profiling and design review.

1. **Per-relay capability memory for negentropy.** Tri-state (`unknown | works | broken`)
   learned from actual NEG-OPEN outcomes, persisted with a long TTL. Removes the failed-probe
   latency without giving up negentropy where it genuinely works.
2. **Main-thread cache-write dedup.** Multi-relay fanout writes each event k× through the
   worker RPC (uuid + structured clone + timer per call) before SQLite dedups. A session LRU of
   recently written ids in front of `cachingRelay.event()` removes the amplification.
3. **Longer term — repository model.** UI subscribes to the cache only; a network syncer keeps
   the cache fresh (watermarks, prioritization, outbox routing internal to it). Requires a live
   `subscribe()` primitive on `CacheRelay`. This decouples "what the UI shows" from "what the
   network fetches" and collapses the UI-facing half of `Query`.

## Performance tips for consumers

- **Use stable, semantic `RequestBuilder` ids.** Identity drives dedup today and any future
  sync-state keying. Avoid embedding volatile values (timestamps) in ids.
- Prefer one builder with multiple filters over many builders for related data — filters
  compress together.
- Use `leaveOpen` for live data instead of re-polling; `keepAlive` to survive remounts.
- `skipCache` only for data that must never be served stale (e.g. NIP-46 RPC).
- Batch profile/metadata loads through the built-in loaders (`ProfileLoaderService`) rather
  than issuing per-pubkey queries.
