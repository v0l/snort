import { dedupe } from "@snort/shared"
import type { QuerySyncState } from "./cache-relay"
import { SyncOverlapWindow } from "./const"
import EventKind from "./event-kind"
import type { ReqFilter, TaggedNostrEvent } from "./nostr"
import { eventMatchesFilter } from "./request-matcher"

/**
 * Pure logic for cache sync coverage (watermarks).
 *
 * Design notes (see docs/packages/system/query-internals.md):
 * - Sync state is keyed on stable query identity (RequestBuilder.id) and
 *   applied to the PRE-ROUTING filter, before the outbox model and query
 *   optimizer reshape it. Composed/compressed filters are not stable
 *   identities (outbox relay picks are randomized per session).
 * - The diffable dimension is whichever single array discriminates the
 *   filter: `authors` OR one `#x` tag. Mixed-dimension, `ids` and `search`
 *   filters are ineligible.
 * - Coverage is EOSE-proven, not possession-derived: an event in the cache
 *   proves nothing about completeness. Watermarks only advance when a relay
 *   round-trip completes.
 * - `limit`-truncated responses only prove the window down to the limit-th
 *   newest matched event.
 */

/**
 * Maximum number of dimension values retained per sync state entry.
 * Overflowing values are treated as fresh (full refetch) — safe overfetch.
 */
export const MaxSyncStateValues = 5_000

/**
 * Kinds excluded from sync coverage because their `created_at` is unreliable
 * for windowing (e.g. NIP-59 gift wraps are backdated up to days).
 */
export const SyncIneligibleKinds = new Set<number>([EventKind.GiftWrap])

export interface SyncDimension {
  /** "authors", a tag key like "#t", or "" for kinds-only filters */
  dimension: string
  values: Array<string>
}

/**
 * Per-sub-filter accounting created at send time and finalized on query EOSE.
 */
export interface SyncRecordPending {
  key: string
  prev?: QuerySyncState
  dimension: string
  kinds: Array<number>
  /** Dimension values carried by this sub-filter */
  values: Array<string>
  /** The sub-filter as sent to the network (or the covered filter when sent=false) */
  filter: ReqFilter
  /** Whether this sub-filter was actually sent to relays */
  sent: boolean
  /** Whether this sub-filter targets values already known to the state */
  known: boolean
}

interface Win {
  since: number
  until: number
}

function sortedKinds(f: ReqFilter): Array<number> {
  return [...(f.kinds ?? [])].sort((a, b) => a - b)
}

function arrEq(a: Array<number>, b: Array<number>) {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

/**
 * Determine the diffable dimension of a filter, or undefined if the filter is
 * not eligible for sync coverage.
 */
export function getSyncDimension(f: ReqFilter): SyncDimension | undefined {
  if (f.ids || f.search) return undefined
  if (!f.kinds || f.kinds.length === 0) return undefined
  if (f.kinds.some(k => SyncIneligibleKinds.has(k))) return undefined

  const dims: Array<[string, Array<string>]> = []
  if (f.authors) {
    dims.push(["authors", f.authors])
  }
  for (const [k, v] of Object.entries(f)) {
    if (k.startsWith("#") && Array.isArray(v)) {
      dims.push([k, v as Array<string>])
    }
  }
  // Mixed-dimension filters (e.g. authors + #p) are not safely diffable
  if (dims.length > 1) return undefined
  if (dims.length === 1) {
    if (dims[0][1].length === 0) return undefined
    return { dimension: dims[0][0], values: dims[0][1] }
  }
  // kinds-only (global) filter
  return { dimension: "", values: [] }
}

/**
 * Stable storage key for a query's sync state.
 */
export function syncStateKey(queryId: string, dim: SyncDimension, f: ReqFilter): string {
  return `sync:${queryId}:${dim.dimension}:${sortedKinds(f).join(",")}`
}

export interface SyncPlan {
  /** Filters to send to the network (may be empty when fully covered) */
  send: Array<ReqFilter>
  /** Accounting to finalize on query EOSE */
  records: Array<SyncRecordPending>
}

/**
 * Plan network sends for a single pre-routing filter given its stored sync
 * state. Splits the dimension into known values (delta / covered) and fresh
 * values (full fetch).
 */
export function planFilterSync(
  f: ReqFilter,
  dim: SyncDimension,
  st: QuerySyncState | undefined,
  key: string,
  now: number,
): SyncPlan {
  const kinds = sortedKinds(f)
  const stValid = st !== undefined && st.version === 1 && st.dimension === dim.dimension && arrEq(st.kinds, kinds)
  const s = f.since ?? 0
  const u = f.until ?? now

  const send: Array<ReqFilter> = []
  const records: Array<SyncRecordPending> = []
  const base = { key, prev: stValid ? st : undefined, dimension: dim.dimension, kinds }

  if (!stValid) {
    send.push(f)
    records.push({ ...base, values: dim.values, filter: f, sent: true, known: false })
    return { send, records }
  }

  const stVals = new Set(st.values)
  const known = dim.values.filter(v => stVals.has(v))
  const fresh = dim.values.filter(v => !stVals.has(v))

  if (fresh.length > 0) {
    const ff = { ...f, [dim.dimension]: fresh } as ReqFilter
    send.push(ff)
    records.push({ ...base, values: fresh, filter: ff, sent: true, known: false })
  }

  const hasKnown = dim.dimension === "" || known.length > 0
  if (hasKnown) {
    const kf = (dim.dimension === "" ? { ...f } : { ...f, [dim.dimension]: known }) as ReqFilter
    if (u <= st.until && s >= st.since) {
      // Requested window fully covered — cache already served it, skip network
      records.push({ ...base, values: known, filter: kf, sent: false, known: true })
    } else if (s >= st.since && s <= st.until && u > st.until) {
      // Extends above coverage — send only the delta
      const df = { ...kf, since: Math.max(s, st.until - SyncOverlapWindow) }
      send.push(df)
      records.push({ ...base, values: known, filter: df, sent: true, known: true })
    } else if (s < st.since && u > st.until && f.limit === undefined) {
      // Superset of coverage (e.g. no `since` at all) — split around the
      // covered window: fetch below and above, skip the proven middle.
      // Not applied to `limit` filters (a limit cannot be split soundly).
      const below = { ...kf, until: st.since } as ReqFilter
      const above = { ...kf, since: st.until - SyncOverlapWindow } as ReqFilter
      send.push(below, above)
      records.push({ ...base, values: known, filter: below, sent: true, known: true })
      records.push({ ...base, values: known, filter: above, sent: true, known: true })
    } else {
      // Below or disjoint from coverage (e.g. pagination into the past) — send unchanged
      send.push(kf)
      records.push({ ...base, values: known, filter: kf, sent: true, known: true })
    }
  }

  return { send, records }
}

function prevWin(prev?: QuerySyncState): Win | undefined {
  return prev ? { since: prev.since, until: prev.until } : undefined
}

/**
 * Merge a newly proven window with an existing one.
 * Overlapping/adjacent windows union; disjoint windows keep the newer one.
 */
function mergeWin(a: Win | undefined, b: Win): Win {
  if (!a) return b
  const overlaps = b.since <= a.until && b.until >= a.since
  if (overlaps) {
    return { since: Math.min(a.since, b.since), until: Math.max(a.until, b.until) }
  }
  return b.until >= a.until ? b : a
}

function intersectWin(a: Win, b: Win): Win {
  return { since: Math.max(a.since, b.since), until: Math.min(a.until, b.until) }
}

/**
 * Finalize sync state for one storage key after query EOSE.
 *
 * All records must share the same key. Returns the updated state, or
 * undefined when nothing valid can be claimed (state should be left as-is).
 */
export function computeSyncState(
  records: Array<SyncRecordPending>,
  feed: Array<TaggedNostrEvent>,
  now: number,
): QuerySyncState | undefined {
  if (records.length === 0) return undefined
  const { prev, dimension, kinds } = records[0]

  // EOSE-proven window of a sent sub-filter: its requested range, with the
  // lower bound raised to the limit-th newest matched event when truncated.
  const provenOf = (f: ReqFilter): Win => {
    const s = f.since ?? 0
    const u = Math.min(f.until ?? now, now)
    let lo = s
    if (f.limit !== undefined) {
      const matched = feed.filter(ev => eventMatchesFilter(ev, f))
      if (matched.length >= f.limit) {
        const created = matched.map(e => e.created_at).sort((a, b) => b - a)
        lo = Math.max(lo, created[f.limit - 1])
      }
    }
    return { since: lo, until: u }
  }

  // Group records by value-set identity: windows proven for the SAME values
  // union (contiguous ranges of one subset), windows of DIFFERENT value
  // subsets intersect (no over-claim for values only proven in a narrower
  // range). Known groups start from the previous coverage window.
  const groups = new Map<string, { withPrev: boolean; wins: Array<Win> }>()
  for (const r of records) {
    const gk = `${r.known ? "k" : "f"}:${[...r.values].sort().join(",")}`
    let g = groups.get(gk)
    if (!g) {
      g = { withPrev: r.known, wins: [] }
      groups.set(gk, g)
    }
    if (r.sent) {
      g.wins.push(provenOf(r.filter))
    }
  }

  let win: Win | undefined
  for (const g of groups.values()) {
    let w: Win | undefined = g.withPrev ? prevWin(prev) : undefined
    for (const pw of g.wins.sort((a, b) => a.since - b.since)) {
      w = mergeWin(w, pw)
    }
    if (!w) continue
    win = win ? intersectWin(win, w) : w
  }
  if (!win || win.until <= win.since) return undefined

  const values = dedupe([...(prev?.values ?? []), ...records.flatMap(r => r.values)])
  if (values.length > MaxSyncStateValues) {
    values.length = MaxSyncStateValues
  }

  return { version: 1, kinds, dimension, values, since: win.since, until: win.until }
}
