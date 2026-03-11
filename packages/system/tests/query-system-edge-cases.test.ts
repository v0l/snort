/**
 * Edge-case tests for the query system:
 *   - NoteCollection / KeyedReplaceableNoteStore
 *   - trimFilters
 *   - eventMatchesFilter / isRequestSatisfied
 *   - Query lifecycle (cancel/uncancel, groupingDelay, progress, addRequest dedup)
 *   - QueryManager (dedup, destroy cleanup, canSendQuery branches)
 */

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import type { CachedTable } from '@snort/shared'
import { EventEmitter } from 'eventemitter3'
import { SocialGraph } from 'nostr-social-graph'
import type { RelayInfoDocument } from '../src'
import type { CachedMetadata, UsersFollows } from '../src/cache'
import type { RelaySettings } from '../src/connection'
import type { ConnectionPool, ConnectionPoolEvents, ConnectionType, ConnectionTypeEvents } from '../src/connection-pool'
import type { NostrEvent, OkResponse, ReqCommand, TaggedNostrEvent } from '../src/nostr'
import { KeyedReplaceableNoteStore, NoteCollection } from '../src/note-collection'
import type { RelayMetadataLoader } from '../src/outbox'
import type { ProfileLoaderService } from '../src/profile-cache'
import { Query, QueryTraceState } from '../src/query'
import { QueryManager } from '../src/query-manager'
import { DefaultOptimizer } from '../src/query-optimizer'
import { RequestBuilder } from '../src/request-builder'
import { eventMatchesFilter, isRequestSatisfied } from '../src/request-matcher'
import { trimFilters } from '../src/request-trim'
import type { SystemConfig, SystemInterface } from '../src/system'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ev(id: string, kind: number, created_at: number, pubkey = 'aa', tags: string[][] = []): TaggedNostrEvent {
  return { id, kind, created_at, pubkey, tags, content: '', sig: '', relays: [] }
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

function makeRb(id: string, groupingDelay = 0) {
  const rb = new RequestBuilder(id)
  rb.withOptions({ groupingDelay })
  rb.withFilter().kinds([1]).limit(10)
  return rb
}

// ---------------------------------------------------------------------------
// Minimal mock connection
// ---------------------------------------------------------------------------

class MockConnection extends EventEmitter<ConnectionTypeEvents> implements ConnectionType {
  readonly id = crypto.randomUUID()
  readonly address: string
  info: RelayInfoDocument | undefined = undefined
  settings: RelaySettings = { read: true, write: true }
  ephemeral = false
  #open: boolean
  #down = false
  sentRequests: Array<ReqCommand> = []

  constructor(address: string, open = true) {
    super()
    this.address = address
    this.#open = open
  }

  get isOpen() {
    return this.#open
  }
  get isDown() {
    return this.#down
  }
  get activeSubscriptions() {
    return this.sentRequests.filter(r => r[0] === 'REQ').length
  }
  get maxSubscriptions() {
    return 20
  }

  open() {
    this.#open = true
    this.emit('connected', false)
    this.emit('change')
  }

  markDown() {
    this.#down = true
  }

  async connect() {}
  close() {}
  async publish(ev: NostrEvent): Promise<OkResponse> {
    return { ok: true, id: '', relay: this.address, event: ev }
  }

  request(req: ReqCommand, cbSent?: () => void) {
    if (this.#open) {
      this.sentRequests.push(req)
      cbSent?.()
    }
  }

  closeRequest(_id: string) {}
  sendRaw(_obj: object) {}
}

// ---------------------------------------------------------------------------
// Minimal mock pool
// ---------------------------------------------------------------------------

class MockPool extends EventEmitter<ConnectionPoolEvents> implements ConnectionPool {
  #conns = new Map<string, MockConnection>()

  add(c: MockConnection) {
    this.#conns.set(c.address, c)
  }

  getConnection(id: string) {
    return this.#conns.get(id)
  }

  async connect(address: string) {
    return this.#conns.get(address)
  }
  disconnect(_a: string) {}
  async broadcast(): Promise<OkResponse[]> {
    return []
  }
  async broadcastTo(_a: string, ev: NostrEvent): Promise<OkResponse> {
    return { ok: true, id: '', relay: _a, event: ev }
  }

  fireConnected(conn: MockConnection) {
    this.emit('connected', conn.address, false)
  }

  *[Symbol.iterator]() {
    yield* this.#conns
  }
}

// ---------------------------------------------------------------------------
// Mock system factory
// ---------------------------------------------------------------------------

function makeSystem(pool: MockPool): SystemInterface {
  const config: SystemConfig = {
    relays: { preload: async () => {} } as unknown as CachedTable<any>,
    profiles: {} as CachedTable<CachedMetadata>,
    contactLists: {} as CachedTable<UsersFollows>,
    optimizer: DefaultOptimizer,
    checkSigs: false,
    automaticOutboxModel: false,
    buildFollowGraph: false,
    fallbackSync: 'since',
    socialGraphInstance: new SocialGraph('00'.repeat(32)),
    disableSyncModule: true,
  }
  return {
    pool,
    config,
    cacheRelay: undefined,
    requestRouter: undefined,
    checkSigs: false,
    optimizer: DefaultOptimizer,
    relayLoader: { TrackKeys: () => {} } as unknown as RelayMetadataLoader,
    profileLoader: {} as ProfileLoaderService,
    userFollowsCache: {} as CachedTable<UsersFollows>,
    traceTimeline: undefined,
    async Init() {},
    GetQuery: () => undefined,
    Query: () => {
      throw new Error('not used')
    },
    Fetch: () => Promise.resolve([]),
    async ConnectToRelay() {},
    DisconnectRelay() {},
    HandleEvent() {},
    async BroadcastEvent() {
      return []
    },
    async WriteOnceToRelay() {
      return { ok: true, id: '', relay: '', event: {} as NostrEvent }
    },
    emit: () => false,
    on: () => ({}) as any,
    off: () => ({}) as any,
    once: () => ({}) as any,
    removeAllListeners: () => ({}) as any,
    listeners: () => [],
    listenerCount: () => 0,
    eventNames: () => [],
    addListener: () => ({}) as any,
    removeListener: () => ({}) as any,
  } as unknown as SystemInterface
}

// ===========================================================================
// 1. NoteCollection / KeyedReplaceableNoteStore
// ===========================================================================

describe('NoteCollection', () => {
  describe('kind-based keying', () => {
    test('regular events (kind 1) are stored by id — two different events coexist', () => {
      const c = new NoteCollection()
      c.add(ev('a', 1, 100))
      c.add(ev('b', 1, 100))
      expect(c.snapshot).toHaveLength(2)
    })

    test('replaceable kind 0 — newer replaces older', () => {
      const c = new NoteCollection()
      c.add(ev('old', 0, 100, 'alice'))
      c.add(ev('new', 0, 200, 'alice'))
      expect(c.snapshot).toHaveLength(1)
      expect(c.snapshot[0].id).toBe('new')
    })

    test('replaceable kind 0 — older does NOT replace newer', () => {
      const c = new NoteCollection()
      c.add(ev('new', 0, 200, 'alice'))
      c.add(ev('old', 0, 100, 'alice'))
      expect(c.snapshot).toHaveLength(1)
      expect(c.snapshot[0].id).toBe('new')
    })

    test('replaceable kind 0 — same-timestamp: first event wins', () => {
      const c = new NoteCollection()
      c.add(ev('first', 0, 100, 'alice'))
      c.add(ev('second', 0, 100, 'alice'))
      expect(c.snapshot[0].id).toBe('first')
    })

    test('replaceable kind 3 — different pubkeys stored separately', () => {
      const c = new NoteCollection()
      c.add(ev('a', 3, 100, 'alice'))
      c.add(ev('b', 3, 100, 'bob'))
      expect(c.snapshot).toHaveLength(2)
    })

    test('legacy replaceable kind 41 — treated as replaceable', () => {
      const c = new NoteCollection()
      c.add(ev('old', 41, 100, 'alice'))
      c.add(ev('new', 41, 200, 'alice'))
      expect(c.snapshot).toHaveLength(1)
      expect(c.snapshot[0].id).toBe('new')
    })

    test('addressable kind 30000 — keyed by kind:pubkey:d-tag', () => {
      const c = new NoteCollection()
      const e1 = ev('a', 30000, 100, 'alice', [['d', 'my-article']])
      const e2 = ev('b', 30000, 200, 'alice', [['d', 'my-article']])
      c.add(e1)
      c.add(e2)
      expect(c.snapshot).toHaveLength(1)
      expect(c.snapshot[0].id).toBe('b')
    })

    test('addressable kind 30000 — different d-tags stored separately', () => {
      const c = new NoteCollection()
      c.add(ev('a', 30000, 100, 'alice', [['d', 'article-1']]))
      c.add(ev('b', 30000, 100, 'alice', [['d', 'article-2']]))
      expect(c.snapshot).toHaveLength(2)
    })

    test('kind boundary: kind 29999 is Regular (stored by id)', () => {
      const c = new NoteCollection()
      c.add(ev('a', 29999, 100, 'alice'))
      c.add(ev('b', 29999, 200, 'alice'))
      expect(c.snapshot).toHaveLength(2)
    })

    test('kind boundary: kind 30000 is Addressable (dedups by kind:pubkey:d)', () => {
      const c = new NoteCollection()
      c.add(ev('a', 30000, 100, 'alice', [['d', 'x']]))
      c.add(ev('b', 30000, 200, 'alice', [['d', 'x']]))
      expect(c.snapshot).toHaveLength(1)
    })

    test('kind boundary: kind 9999 is Regular', () => {
      const c = new NoteCollection()
      c.add(ev('a', 9999, 100, 'alice'))
      c.add(ev('b', 9999, 200, 'alice'))
      expect(c.snapshot).toHaveLength(2)
    })

    test('kind boundary: kind 10000 is Replaceable', () => {
      const c = new NoteCollection()
      c.add(ev('a', 10000, 100, 'alice'))
      c.add(ev('b', 10000, 200, 'alice'))
      expect(c.snapshot).toHaveLength(1)
      expect(c.snapshot[0].id).toBe('b')
    })

    test('addressable event missing d-tag — key is "kind:pubkey:undefined", two missing-d events from same pubkey+kind merge', () => {
      const c = new NoteCollection()
      // No d tag — key will be "30000:alice:undefined"
      c.add(ev('a', 30000, 100, 'alice'))
      c.add(ev('b', 30000, 200, 'alice'))
      // Both share the "undefined" d-tag key, so the newer one wins
      expect(c.snapshot).toHaveLength(1)
      expect(c.snapshot[0].id).toBe('b')
    })
  })

  describe('relay merging on replacement', () => {
    test('replacing event merges relay lists from old into new', () => {
      const c = new NoteCollection()
      const old = { ...ev('old', 0, 100, 'alice'), relays: ['wss://r1.test'] }
      const newer = { ...ev('new', 0, 200, 'alice'), relays: ['wss://r2.test'] }
      c.add(old)
      c.add(newer)
      // The stored event should carry both relays
      expect(c.snapshot[0].relays).toContain('wss://r1.test')
      expect(c.snapshot[0].relays).toContain('wss://r2.test')
    })
  })

  describe('event with created_at === 0', () => {
    test('is never stored (strict > 0 check)', () => {
      const c = new NoteCollection()
      c.add(ev('zero', 1, 0))
      expect(c.snapshot).toHaveLength(0)
    })
  })

  describe('add() return value', () => {
    test('returns 1 when event is added', () => {
      const c = new NoteCollection()
      expect(c.add(ev('a', 1, 100))).toBe(1)
    })

    test('returns 0 when event is a duplicate (same id)', () => {
      const c = new NoteCollection()
      c.add(ev('a', 1, 100))
      expect(c.add(ev('a', 1, 100))).toBe(0)
    })

    test('returns 0 when older replaceable event does not replace existing', () => {
      const c = new NoteCollection()
      c.add(ev('new', 0, 200, 'alice'))
      expect(c.add(ev('old', 0, 100, 'alice'))).toBe(0)
    })
  })

  describe('snapshot laziness', () => {
    test('snapshot is invalidated after add and recomputed on next read', () => {
      const c = new NoteCollection()
      const snap1 = c.snapshot // initial: []
      c.add(ev('a', 1, 100))
      const snap2 = c.snapshot
      // snap1 should still be empty; snap2 has the event
      expect(snap1).toHaveLength(0)
      expect(snap2).toHaveLength(1)
    })

    test('takeSnapshot() is always fresh, independent of cached snapshot', () => {
      const c = new NoteCollection()
      c.add(ev('a', 1, 100))
      const cached = c.snapshot
      c.add(ev('b', 1, 200))
      // cached is stale (still just 'a') — snapshot gets recomputed
      const fresh = c.takeSnapshot()
      expect(fresh).toHaveLength(2)
      // now access snapshot again — should also reflect both
      expect(c.snapshot).toHaveLength(2)
    })
  })

  describe('clear()', () => {
    test('snapshot is empty after clear', () => {
      const c = new NoteCollection()
      c.add(ev('a', 1, 100))
      c.clear()
      expect(c.snapshot).toHaveLength(0)
    })

    test('new events can be added after clear', () => {
      const c = new NoteCollection()
      c.add(ev('a', 1, 100))
      c.clear()
      c.add(ev('b', 1, 200))
      expect(c.snapshot).toHaveLength(1)
      expect(c.snapshot[0].id).toBe('b')
    })

    test('clear() emits event immediately with empty array', () => {
      const c = new NoteCollection()
      c.add(ev('a', 1, 100))
      const emissions: Array<TaggedNostrEvent[]> = []
      c.on('event', evs => emissions.push(evs))
      c.clear()
      expect(emissions).toHaveLength(1)
      expect(emissions[0]).toHaveLength(0)
    })

    test('clear() cancels any pending buffered emit', async () => {
      const c = new NoteCollection()
      const emissions: Array<TaggedNostrEvent[]> = []
      c.on('event', evs => emissions.push(evs))

      c.add(ev('a', 1, 100)) // schedules 300ms timer, buffers 'a'
      c.clear() // should cancel timer and emit [] immediately

      await sleep(400) // wait past the 300ms emit interval

      // Should have exactly one emission from clear() — the buffered 'a' add
      // must NOT fire separately after clear()
      expect(emissions).toHaveLength(1)
      expect(emissions[0]).toHaveLength(0)
    })

    test('events added after clear() emit correctly', async () => {
      const c = new NoteCollection()
      const emissions: Array<TaggedNostrEvent[]> = []
      c.on('event', evs => emissions.push(evs))

      c.clear() // clear an already-empty store
      c.add(ev('a', 1, 100))

      await sleep(400)

      // The clear() emits [], then the add should emit normally
      expect(emissions).toHaveLength(2)
      expect(emissions[0]).toHaveLength(0) // from clear()
      expect(emissions[1][0].id).toBe('a') // from add()
    })
  })

  describe('emission', () => {
    test('add() emits event after 300ms interval', async () => {
      const c = new NoteCollection()
      const emissions: Array<TaggedNostrEvent[]> = []
      c.on('event', evs => emissions.push(evs))

      c.add(ev('a', 1, 100))
      expect(emissions).toHaveLength(0) // not yet

      await sleep(400)
      expect(emissions).toHaveLength(1)
      expect(emissions[0][0].id).toBe('a')
    })

    test('multiple adds within the interval are batched into one emission', async () => {
      const c = new NoteCollection()
      const emissions: Array<TaggedNostrEvent[]> = []
      c.on('event', evs => emissions.push(evs))

      c.add(ev('a', 1, 100))
      c.add(ev('b', 1, 200))
      c.add(ev('c', 1, 300))

      await sleep(400)
      expect(emissions).toHaveLength(1)
      expect(emissions[0]).toHaveLength(3)
    })

    test('duplicate events do not emit', async () => {
      const c = new NoteCollection()
      const emissions: Array<TaggedNostrEvent[]> = []
      c.on('event', evs => emissions.push(evs))

      c.add(ev('a', 1, 100))
      await sleep(400)
      emissions.length = 0 // reset

      c.add(ev('a', 1, 100)) // exact duplicate
      await sleep(400)
      expect(emissions).toHaveLength(0)
    })

    test('older replaceable event does not emit', async () => {
      const c = new NoteCollection()
      c.add(ev('new', 0, 200, 'alice'))
      await sleep(400)

      const emissions: Array<TaggedNostrEvent[]> = []
      c.on('event', evs => emissions.push(evs))

      c.add(ev('old', 0, 100, 'alice'))
      await sleep(400)
      expect(emissions).toHaveLength(0)
    })

    test('flushEmit() on empty buffer does not block future emissions', async () => {
      const c = new NoteCollection()
      const emissions: Array<TaggedNostrEvent[]> = []
      c.on('event', evs => emissions.push(evs))

      // Call flushEmit() manually when nothing is buffered (ghost-timer scenario)
      c.flushEmit()

      // Now add an event — it must still emit
      c.add(ev('a', 1, 100))
      await sleep(400)
      expect(emissions).toHaveLength(1)
      expect(emissions[0][0].id).toBe('a')
    })
  })

  describe('batch add', () => {
    test('array of events is added correctly', () => {
      const c = new NoteCollection()
      c.add([ev('a', 1, 100), ev('b', 1, 200)])
      expect(c.snapshot).toHaveLength(2)
    })

    test('returns count of actually-stored events in batch', () => {
      const c = new NoteCollection()
      c.add(ev('a', 1, 100))
      // second call: 'a' is dup (0), 'b' is new (1)
      const count = c.add([ev('a', 1, 100), ev('b', 1, 200)])
      expect(count).toBe(1)
    })
  })
})

// ===========================================================================
// 2. trimFilters
// ===========================================================================

describe('trimFilters', () => {
  test('keeps filter with no array fields (scalar only)', () => {
    expect(trimFilters([{ since: 100 }])).toHaveLength(1)
  })

  test('keeps empty filter {} — vacuously passes (every on empty array)', () => {
    // An empty filter {} means "fetch everything" — trimFilters does NOT remove it
    expect(trimFilters([{}])).toHaveLength(1)
  })

  test('removes filter with empty kinds array', () => {
    expect(trimFilters([{ kinds: [] }])).toHaveLength(0)
  })

  test('removes filter with empty authors array', () => {
    expect(trimFilters([{ authors: [] }])).toHaveLength(0)
  })

  test('removes filter with empty ids array', () => {
    expect(trimFilters([{ ids: [] }])).toHaveLength(0)
  })

  test('removes filter where any array field is empty (even if others are non-empty)', () => {
    expect(trimFilters([{ kinds: [1], authors: [] }])).toHaveLength(0)
  })

  test('keeps filter where all array fields are non-empty', () => {
    expect(trimFilters([{ kinds: [1], authors: ['aa'] }])).toHaveLength(1)
  })

  test('removes filter with empty tag array (#e)', () => {
    expect(trimFilters([{ '#e': [] }])).toHaveLength(0)
  })

  test('keeps filter with non-empty tag array', () => {
    expect(trimFilters([{ '#e': ['someid'] }])).toHaveLength(1)
  })

  test('handles multiple filters, only removes the bad ones', () => {
    const result = trimFilters([{ kinds: [1] }, { kinds: [] }, { authors: ['aa'], kinds: [1] }])
    expect(result).toHaveLength(2)
  })

  test('returns empty array when all filters are empty-array', () => {
    expect(trimFilters([{ kinds: [] }, { authors: [] }])).toHaveLength(0)
  })
})

// ===========================================================================
// 3. eventMatchesFilter
// ===========================================================================

describe('eventMatchesFilter', () => {
  const base: TaggedNostrEvent = {
    id: 'evt1',
    kind: 1,
    pubkey: 'aa',
    created_at: 500,
    tags: [],
    content: '',
    sig: '',
    relays: [],
  }

  test('empty filter matches any event', () => {
    expect(eventMatchesFilter(base, {})).toBe(true)
  })

  test('ids match', () => {
    expect(eventMatchesFilter(base, { ids: ['evt1'] })).toBe(true)
    expect(eventMatchesFilter(base, { ids: ['other'] })).toBe(false)
  })

  test('ids: [] (empty) — event does NOT match', () => {
    expect(eventMatchesFilter(base, { ids: [] })).toBe(false)
  })

  test('authors match', () => {
    expect(eventMatchesFilter(base, { authors: ['aa'] })).toBe(true)
    expect(eventMatchesFilter(base, { authors: ['bb'] })).toBe(false)
  })

  test('kinds match', () => {
    expect(eventMatchesFilter(base, { kinds: [1] })).toBe(true)
    expect(eventMatchesFilter(base, { kinds: [2] })).toBe(false)
  })

  test('since: event at exactly since is NOT rejected (created_at === since passes)', () => {
    // filter.since = 500, ev.created_at = 500 → 500 < 500 is false → passes
    expect(eventMatchesFilter(base, { since: 500 })).toBe(true)
  })

  test('since: event older than since is rejected', () => {
    expect(eventMatchesFilter(base, { since: 501 })).toBe(false)
  })

  test('since: 0 is treated as falsy — does NOT filter anything (known quirk)', () => {
    const oldEv = { ...base, created_at: 1 }
    // since: 0 is falsy, so the check `if (filter.since && ...)` never fires
    expect(eventMatchesFilter(oldEv, { since: 0 })).toBe(true)
  })

  test('until: event at exactly until is NOT rejected', () => {
    // filter.until = 500, ev.created_at = 500 → 500 > 500 is false → passes
    expect(eventMatchesFilter(base, { until: 500 })).toBe(true)
  })

  test('until: event newer than until is rejected', () => {
    expect(eventMatchesFilter(base, { until: 499 })).toBe(false)
  })

  test('until: 0 is treated as falsy — does NOT filter anything (known quirk)', () => {
    const futureEv = { ...base, created_at: 9999999 }
    expect(eventMatchesFilter(futureEv, { until: 0 })).toBe(true)
  })

  test('tag filters (#e, #p) are NOT checked — any event passes regardless of tags', () => {
    const noTags = { ...base, tags: [] }
    // Even though filter requests specific #e values, matcher ignores them
    expect(eventMatchesFilter(noTags, { '#e': ['someEventId'] })).toBe(true)
  })

  test('combined filter: all matching fields pass', () => {
    expect(
      eventMatchesFilter(base, {
        ids: ['evt1'],
        authors: ['aa'],
        kinds: [1],
        since: 100,
        until: 1000,
      }),
    ).toBe(true)
  })

  test('combined filter: one failing field fails the whole match', () => {
    expect(
      eventMatchesFilter(base, {
        ids: ['evt1'],
        kinds: [2], // wrong kind
      }),
    ).toBe(false)
  })
})

// ===========================================================================
// 4. isRequestSatisfied
// ===========================================================================

describe('isRequestSatisfied', () => {
  const results: TaggedNostrEvent[] = [ev('id1', 1, 100), ev('id2', 1, 200)]

  test('satisfied when all requested ids are in results', () => {
    expect(isRequestSatisfied({ ids: ['id1', 'id2'] }, results)).toBe(true)
  })

  test('not satisfied when one id is missing', () => {
    expect(isRequestSatisfied({ ids: ['id1', 'id3'] }, results)).toBeUndefined()
  })

  test('not satisfied when ids field is absent — returns undefined for any author/kind filter', () => {
    expect(isRequestSatisfied({ authors: ['aa'], kinds: [1] }, results)).toBeUndefined()
  })

  test('not satisfied with empty ids array (no ids to satisfy)', () => {
    // ids: [] — every() on empty is vacuously true, but there are no ids to actually satisfy
    // Actually: [].every(...) === true, so filter.ids is [], filter.ids.every(...) === true → returns true
    // This is a quirk: an empty ids filter is considered "satisfied"
    expect(isRequestSatisfied({ ids: [] }, results)).toBe(true)
  })

  test('not satisfied when results is empty', () => {
    expect(isRequestSatisfied({ ids: ['id1'] }, [])).toBeUndefined()
  })

  test('returns undefined (not false) when not satisfied', () => {
    const result = isRequestSatisfied({ ids: ['missing'] }, results)
    expect(result).toBeUndefined()
  })
})

// ===========================================================================
// 5. Query lifecycle
// ===========================================================================

describe('Query lifecycle', () => {
  test('progress is 0 when there are no traces', () => {
    const rb = makeRb('test')
    const q = new Query(rb)
    expect(q.progress).toBe(0)
  })

  test('groupingDelay 0 emits request synchronously', () => {
    const rb = makeRb('test', 0)
    const q = new Query(rb)
    const requests: unknown[] = []
    q.on('request', (_id, filters) => requests.push(filters))
    q.start()
    // synchronous — no need to await
    expect(requests).toHaveLength(1)
  })

  test('groupingDelay > 0 does not emit request synchronously', () => {
    const rb = makeRb('test', 50)
    const q = new Query(rb)
    const requests: unknown[] = []
    q.on('request', (_id, filters) => requests.push(filters))
    q.start()
    // Not yet fired
    expect(requests).toHaveLength(0)
  })

  test('groupingDelay > 0 emits after delay', async () => {
    const rb = makeRb('test', 50)
    const q = new Query(rb)
    const requests: unknown[] = []
    q.on('request', (_id, filters) => requests.push(filters))
    q.start()
    await sleep(100)
    expect(requests).toHaveLength(1)
  })

  test('start() is re-entrant safe — second call while timer pending is a no-op', async () => {
    const rb = makeRb('test', 50)
    const q = new Query(rb)
    const requests: unknown[] = []
    q.on('request', (_id, filters) => requests.push(filters))
    q.start()
    q.start() // second call — should NOT add a second timer
    await sleep(100)
    expect(requests).toHaveLength(1)
  })

  test('cancel() + uncancel() within grace window preserves query', async () => {
    const rb = makeRb('test')
    const q = new Query(rb)
    q.cancel()
    expect(q.canRemove()).toBe(false) // within 1s grace window
    q.uncancel()
    await sleep(1100) // past grace window
    expect(q.canRemove()).toBe(false) // uncancel cleared #cancelAt
  })

  test('cancel() causes canRemove() to return true after 1 second', async () => {
    const rb = makeRb('test')
    const q = new Query(rb)
    q.cancel()
    expect(q.canRemove()).toBe(false)
    await sleep(1100)
    expect(q.canRemove()).toBe(true)
  })

  test('addRequest with same builder instance is a no-op (returns undefined)', () => {
    const rb = makeRb('test')
    const q = new Query(rb)
    // Same instance — dedup by rb.instance UUID
    const result = q.addRequest(rb)
    expect(result).toBeUndefined()
  })

  test('addRequest with different builder instance but same id merges filters', () => {
    const rb1 = new RequestBuilder('shared-id')
    rb1.withFilter().kinds([1])
    const q = new Query(rb1)

    const rb2 = new RequestBuilder('shared-id') // different instance, same id
    rb2.withFilter().kinds([2])
    const result = q.addRequest(rb2)
    expect(result).toBe(true)
    // Both filter sets should now be in q.requests
    expect(q.requests.length).toBe(2)
  })

  test('addRequest with zero filters returns false and does not queue requests', () => {
    const rb1 = makeRb('test')
    const q = new Query(rb1)

    const rbEmpty = new RequestBuilder('test') // no filters added
    const result = q.addRequest(rbEmpty)
    expect(result).toBe(false)
  })

  test("'eose' query event fires when all traces reach terminal state (including TIMEOUT)", async () => {
    const rb = makeRb('test', 0)
    const q = new Query(rb)
    let eoseFired = false
    q.on('eose', () => {
      eoseFired = true
    })

    // Manually add a trace and drive it to timeout
    const { QueryTrace } = await import('../src/query')
    const trace = new QueryTrace('wss://r.test', [{ kinds: [1] }], 'conn1', false)
    q.addTrace(trace)
    trace.queued()
    trace.sent()
    trace.timeout()

    expect(eoseFired).toBe(true)
    expect(q.progress).toBe(1)
  })

  test("'eose' query event fires on DROP too", async () => {
    const rb = makeRb('test', 0)
    const q = new Query(rb)
    let eoseFired = false
    q.on('eose', () => {
      eoseFired = true
    })

    const { QueryTrace } = await import('../src/query')
    const trace = new QueryTrace('wss://r.test', [{ kinds: [1] }], 'conn1', false)
    q.addTrace(trace)
    trace.queued()
    trace.drop()

    expect(eoseFired).toBe(true)
  })

  test('streaming trace (leaveOpen=true) never reaches finished state after eose', async () => {
    const rb = new RequestBuilder('streaming')
    rb.withOptions({ leaveOpen: true, groupingDelay: 0 })
    rb.withFilter().kinds([1])
    const q = new Query(rb)

    const { QueryTrace } = await import('../src/query')
    const trace = new QueryTrace('wss://r.test', [{ kinds: [1] }], 'conn1', true)
    q.addTrace(trace)
    trace.queued()
    trace.sent() // transitions to WAITING_STREAM

    // WAITING_STREAM is not a terminal state — progress stays < 1
    expect(trace.finished).toBe(false)
    expect(q.progress).toBe(0)
  })

  test('QueryTrace same-state transition is a no-op (no event emitted)', async () => {
    const rb = makeRb('test')
    const q = new Query(rb)

    const { QueryTrace } = await import('../src/query')
    const trace = new QueryTrace('wss://r.test', [], 'conn1', false)
    const changes: string[] = []
    trace.on('stateChange', e => changes.push(e.state))

    trace.queued()
    trace.queued() // duplicate — no-op
    expect(changes).toHaveLength(1)
    expect(changes[0]).toBe(QueryTraceState.QUEUED)
  })
})

// ===========================================================================
// 6. QueryManager — dedup, canSendQuery branches, destroy
// ===========================================================================

describe('QueryManager', () => {
  let pool: MockPool
  let system: SystemInterface
  let qm: QueryManager

  beforeEach(() => {
    pool = new MockPool()
    system = makeSystem(pool)
    qm = new QueryManager(system)
  })

  afterEach(() => {
    qm.destroy()
  })

  test('query() dedup by id — returns same Query object for same id', () => {
    const rb1 = new RequestBuilder('same-id')
    rb1.withFilter().kinds([1])
    const rb2 = new RequestBuilder('same-id')
    rb2.withFilter().kinds([2])

    const q1 = qm.query(rb1)
    const q2 = qm.query(rb2)
    expect(q1).toBe(q2) // same object
  })

  test('query() different ids — returns different Query objects', () => {
    const rb1 = makeRb('id-one')
    const rb2 = makeRb('id-two')
    expect(qm.query(rb1)).not.toBe(qm.query(rb2))
  })

  test('query() with zero-filter builder — query exists but no request is emitted', async () => {
    const rb = new RequestBuilder('no-filters') // no withFilter() call
    const q = qm.query(rb)
    const requests: unknown[] = []
    q.on('request', (_, f) => requests.push(f))
    q.start()
    await sleep(50)
    expect(requests).toHaveLength(0)
  })

  test('#canSendQuery: isDown connection is skipped', async () => {
    const conn = new MockConnection('wss://relay.test', true)
    conn.markDown()
    pool.add(conn)

    const rb = makeRb('test-down')
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    expect(conn.sentRequests).toHaveLength(0)
    expect(q.traces).toHaveLength(0)
  })

  test('#canSendQuery: ephemeral connection is skipped for broadcast queries', async () => {
    const conn = new MockConnection('wss://relay.test', true)
    conn.ephemeral = true
    pool.add(conn)

    const rb = makeRb('test-ephemeral')
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    expect(conn.sentRequests).toHaveLength(0)
  })

  test('#canSendQuery: search query skipped when relay has no NIP-11 info', async () => {
    const conn = new MockConnection('wss://relay.test', true)
    // conn.info is undefined — no NIP-50 search support known
    pool.add(conn)

    const rb = new RequestBuilder('search-test')
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().kinds([1]).search('hello')
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    // Should not send to a relay with unknown NIP support
    expect(conn.sentRequests).toHaveLength(0)
  })

  test('#canSendQuery: search query sent when relay advertises NIP-50', async () => {
    const conn = new MockConnection('wss://relay.test', true)
    conn.info = { supported_nips: [50] } as any
    pool.add(conn)

    const rb = new RequestBuilder('search-test-supported')
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().kinds([1]).search('hello')
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    expect(conn.sentRequests).toHaveLength(1)
    expect(conn.sentRequests[0][0]).toBe('REQ')
  })

  test('empty filters are dropped — no REQ sent', async () => {
    const conn = new MockConnection('wss://relay.test', true)
    pool.add(conn)

    // Build a query that will produce an empty filter after trimming
    const rb = new RequestBuilder('empty-filter-test')
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().kinds([]) // empty kinds → trimmed away
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    expect(conn.sentRequests).toHaveLength(0)
  })

  test('destroy() removes all queries from internal map', async () => {
    const rb = makeRb('test-destroy')
    qm.query(rb)

    expect(qm.get('test-destroy')).toBeDefined()
    qm.destroy()
    expect(qm.get('test-destroy')).toBeUndefined()
  })

  test('destroy() cancels all queries so they can be removed', async () => {
    const rb = makeRb('test-destroy-cancel')
    const q = qm.query(rb)
    expect(q.canRemove()).toBe(false)

    qm.destroy()
    // destroy() calls q.cancel() which sets a 1-second grace window
    // canRemove() will become true after the grace window — verify cancel was called
    await sleep(1100)
    expect(q.canRemove()).toBe(true)
  })

  test('query is cleaned up after cancel grace window expires', async () => {
    const conn = new MockConnection('wss://relay.test', true)
    pool.add(conn)

    const rb = makeRb('test-cleanup')
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    // Cancel the query
    q.cancel()
    // The query should still be gettable during the grace window
    expect(qm.get('test-cleanup')).toBeDefined()

    // Wait for the 1-second grace + 1-second cleanup interval
    await sleep(2200)
    expect(qm.get('test-cleanup')).toBeUndefined()
  })
})
