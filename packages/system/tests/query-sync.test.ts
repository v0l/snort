import { describe, expect, test } from "bun:test"
import type { QuerySyncState } from "../src/cache-relay"
import { SyncOverlapWindow } from "../src/const"
import type { ReqFilter, TaggedNostrEvent } from "../src/nostr"
import {
  computeSyncState,
  getSyncDimension,
  planFilterSync,
  type SyncRecordPending,
  syncStateKey,
} from "../src/query-sync"

const NOW = 1_700_000_000

function ev(id: string, created_at: number, pubkey = "aa", kind = 1, tags: string[][] = []): TaggedNostrEvent {
  return { id, pubkey, created_at, kind, tags, content: "", sig: "", relays: [] }
}

function st(partial: Partial<QuerySyncState>): QuerySyncState {
  return {
    version: 1,
    kinds: [1],
    dimension: "authors",
    values: ["aa"],
    since: NOW - 86400,
    until: NOW - 3600,
    ...partial,
  }
}

describe("getSyncDimension", () => {
  test("authors filter", () => {
    expect(getSyncDimension({ kinds: [1], authors: ["aa", "bb"] })).toEqual({
      dimension: "authors",
      values: ["aa", "bb"],
    })
  })

  test("tag filter (#t)", () => {
    expect(getSyncDimension({ kinds: [1], "#t": ["nostr"] })).toEqual({ dimension: "#t", values: ["nostr"] })
  })

  test("kinds-only (global) filter", () => {
    expect(getSyncDimension({ kinds: [30311] })).toEqual({ dimension: "", values: [] })
  })

  test("mixed dimensions (authors + #p) ineligible", () => {
    expect(getSyncDimension({ kinds: [1], authors: ["aa"], "#p": ["bb"] })).toBeUndefined()
  })

  test("ids ineligible", () => {
    expect(getSyncDimension({ kinds: [1], ids: ["x"] })).toBeUndefined()
  })

  test("search ineligible", () => {
    expect(getSyncDimension({ kinds: [1], search: "hello" })).toBeUndefined()
  })

  test("no kinds ineligible", () => {
    expect(getSyncDimension({ authors: ["aa"] })).toBeUndefined()
  })

  test("gift wrap kind ineligible (backdated timestamps)", () => {
    expect(getSyncDimension({ kinds: [1059], "#p": ["aa"] })).toBeUndefined()
  })

  test("relays field is not a dimension", () => {
    expect(getSyncDimension({ kinds: [1], authors: ["aa"], relays: ["wss://r"] })).toEqual({
      dimension: "authors",
      values: ["aa"],
    })
  })
})

describe("syncStateKey", () => {
  test("stable across kind order", () => {
    const dim = { dimension: "authors", values: ["aa"] }
    expect(syncStateKey("q1", dim, { kinds: [6, 1] })).toBe(syncStateKey("q1", dim, { kinds: [1, 6] }))
  })
})

describe("planFilterSync", () => {
  const dim = { dimension: "authors", values: ["aa", "bb"] }

  test("no state — passthrough with record", () => {
    const f: ReqFilter = { kinds: [1], authors: ["aa", "bb"] }
    const plan = planFilterSync(f, dim, undefined, "k", NOW)
    expect(plan.send).toEqual([f])
    expect(plan.records).toHaveLength(1)
    expect(plan.records[0].sent).toBe(true)
    expect(plan.records[0].known).toBe(false)
  })

  test("kinds mismatch — state ignored", () => {
    const f: ReqFilter = { kinds: [1, 6], authors: ["aa", "bb"] }
    const plan = planFilterSync(f, dim, st({ kinds: [1] }), "k", NOW)
    expect(plan.send).toEqual([f])
  })

  test("known values get delta/split, fresh get full fetch", () => {
    const f: ReqFilter = { kinds: [1], authors: ["aa", "bb"] }
    const state = st({ values: ["aa"], since: NOW - 86400, until: NOW - 3600 })
    const plan = planFilterSync(f, dim, state, "k", NOW)
    // fresh full fetch + known split (below coverage, above coverage)
    expect(plan.send).toHaveLength(3)
    const freshF = plan.send.find(a => a.authors?.includes("bb"))
    expect(freshF?.since).toBeUndefined()
    const knownFs = plan.send.filter(a => a.authors?.includes("aa"))
    expect(knownFs).toHaveLength(2)
    const below = knownFs.find(a => a.until !== undefined)
    const above = knownFs.find(a => a.since !== undefined && a.until === undefined)
    expect(below?.until).toBe(NOW - 86400)
    expect(above?.since).toBe(NOW - 3600 - SyncOverlapWindow)
  })

  test("known values with since inside coverage get simple delta", () => {
    const f: ReqFilter = { kinds: [1], authors: ["aa"], since: NOW - 7200 }
    const state = st({ values: ["aa"], since: NOW - 86400, until: NOW - 3600 })
    const plan = planFilterSync(f, { dimension: "authors", values: ["aa"] }, state, "k", NOW)
    expect(plan.send).toHaveLength(1)
    expect(plan.send[0].since).toBe(NOW - 3600 - SyncOverlapWindow)
  })

  test("limit filters are not split on superset ranges", () => {
    const f: ReqFilter = { kinds: [1], authors: ["aa"], limit: 50 }
    const state = st({ values: ["aa"], since: NOW - 86400, until: NOW - 3600 })
    const plan = planFilterSync(f, { dimension: "authors", values: ["aa"] }, state, "k", NOW)
    // superset + limit → sent unchanged
    expect(plan.send).toEqual([f])
  })

  test("fully covered window is dropped from network", () => {
    const f: ReqFilter = { kinds: [1], authors: ["aa"], since: NOW - 7200, until: NOW - 3600 }
    const state = st({ values: ["aa"], since: NOW - 86400, until: NOW - 1800 })
    const plan = planFilterSync(f, { dimension: "authors", values: ["aa"] }, state, "k", NOW)
    expect(plan.send).toHaveLength(0)
    expect(plan.records).toHaveLength(1)
    expect(plan.records[0].sent).toBe(false)
  })

  test("pagination below coverage sent unchanged", () => {
    const f: ReqFilter = { kinds: [1], authors: ["aa"], until: NOW - 90000, limit: 50 }
    const state = st({ values: ["aa"], since: NOW - 86400, until: NOW - 1800 })
    const plan = planFilterSync(f, { dimension: "authors", values: ["aa"] }, state, "k", NOW)
    expect(plan.send).toEqual([f])
  })

  test("kinds-only filter uses window logic on whole filter", () => {
    const f: ReqFilter = { kinds: [30311], since: NOW - 86400 }
    const state = st({ kinds: [30311], dimension: "", values: [], since: NOW - 172800, until: NOW - 600 })
    const plan = planFilterSync(f, { dimension: "", values: [] }, state, "k", NOW)
    expect(plan.send).toHaveLength(1)
    expect(plan.send[0].since).toBe(NOW - 600 - SyncOverlapWindow)
  })
})

describe("computeSyncState", () => {
  function rec(partial: Partial<SyncRecordPending>): SyncRecordPending {
    return {
      key: "k",
      prev: undefined,
      dimension: "authors",
      kinds: [1],
      values: ["aa"],
      filter: { kinds: [1], authors: ["aa"] },
      sent: true,
      known: false,
      ...partial,
    }
  }

  test("no limit — proven window is full requested range", () => {
    const next = computeSyncState([rec({ filter: { kinds: [1], authors: ["aa"], since: NOW - 3600 } })], [], NOW)
    expect(next).toMatchObject({ since: NOW - 3600, until: NOW, values: ["aa"] })
  })

  test("limit truncation raises the lower bound to the limit-th newest event", () => {
    const feed = [ev("a", NOW - 100), ev("b", NOW - 200), ev("c", NOW - 300)]
    const next = computeSyncState([rec({ filter: { kinds: [1], authors: ["aa"], limit: 2 } })], feed, NOW)
    expect(next?.since).toBe(NOW - 200)
    expect(next?.until).toBe(NOW)
  })

  test("under-limit result proves the full range", () => {
    const feed = [ev("a", NOW - 100)]
    const next = computeSyncState(
      [rec({ filter: { kinds: [1], authors: ["aa"], since: NOW - 3600, limit: 50 } })],
      feed,
      NOW,
    )
    expect(next?.since).toBe(NOW - 3600)
  })

  test("delta merges with overlapping previous window", () => {
    const prev = st({ values: ["aa"], since: NOW - 86400, until: NOW - 3600 })
    const next = computeSyncState(
      [
        rec({
          prev,
          known: true,
          filter: { kinds: [1], authors: ["aa"], since: NOW - 3600 - SyncOverlapWindow },
        }),
      ],
      [],
      NOW,
    )
    expect(next).toMatchObject({ since: NOW - 86400, until: NOW })
  })

  test("disjoint truncated delta keeps only the newer window (no gap claim)", () => {
    const prev = st({ values: ["aa"], since: NOW - 86400, until: NOW - 86000 })
    // 2 events at the top, limit 2 → truncation point NOW-200, disjoint from prev
    const feed = [ev("a", NOW - 100), ev("b", NOW - 200)]
    const next = computeSyncState(
      [rec({ prev, known: true, filter: { kinds: [1], authors: ["aa"], since: NOW - 86000, limit: 2 } })],
      feed,
      NOW,
    )
    expect(next).toMatchObject({ since: NOW - 200, until: NOW })
  })

  test("fresh + known windows intersect (no over-claim for new values)", () => {
    const prev = st({ values: ["aa"], since: NOW - 86400, until: NOW - 3600 })
    const feed = [ev("f1", NOW - 500, "bb"), ev("f2", NOW - 900, "bb")]
    const records = [
      rec({ prev, known: true, values: ["aa"], filter: { kinds: [1], authors: ["aa"], since: NOW - 3900 } }),
      // fresh value truncated at NOW-900
      rec({ prev, known: false, values: ["bb"], filter: { kinds: [1], authors: ["bb"], limit: 2 } }),
    ]
    const next = computeSyncState(records, feed, NOW)
    // known would claim [NOW-86400, NOW], fresh only proves [NOW-900, NOW]
    expect(next).toMatchObject({ since: NOW - 900, until: NOW })
    expect(next?.values.sort()).toEqual(["aa", "bb"])
  })

  test("covered (not sent) known filter keeps previous window", () => {
    const prev = st({ values: ["aa"], since: NOW - 86400, until: NOW - 3600 })
    const next = computeSyncState(
      [rec({ prev, known: true, sent: false, filter: { kinds: [1], authors: ["aa"] } })],
      [],
      NOW,
    )
    expect(next).toMatchObject({ since: NOW - 86400, until: NOW - 3600 })
  })

  test("degenerate window returns undefined (state left as-is)", () => {
    const prev = st({ values: ["aa"], since: NOW - 1000, until: NOW - 500 })
    // fresh disjoint below the known window → empty intersection
    const feed = Array.from({ length: 2 }, (_, i) => ev(`x${i}`, NOW - 5000 - i, "bb"))
    const records = [
      rec({ prev, known: true, sent: false, values: ["aa"], filter: { kinds: [1], authors: ["aa"] } }),
      rec({
        prev,
        known: false,
        values: ["bb"],
        filter: { kinds: [1], authors: ["bb"], until: NOW - 4000, limit: 2 },
      }),
    ]
    expect(computeSyncState(records, feed, NOW)).toBeUndefined()
  })

  test("values are unioned and capped", () => {
    const prev = st({ values: ["aa"] })
    const next = computeSyncState(
      [rec({ prev, known: false, values: ["bb"], filter: { kinds: [1], authors: ["bb"] } })],
      [],
      NOW,
    )
    expect(next?.values.sort()).toEqual(["aa", "bb"])
  })
})
