import type { NostrEvent, ReqFilter, TaggedNostrEvent } from "./nostr"

/**
 * A pre-compiled version of a ReqFilter using Sets for O(1) membership checks.
 * Building the Sets once and reusing them avoids the O(|authors|) / O(|ids|)
 * array scans that `Array.includes` incurs on every event — a real hot path
 * when follow-list filters carry hundreds/thousands of authors.
 */
interface CompiledFilter {
  ids?: Set<string>
  authors?: Set<string>
  kinds?: Set<number>
  since?: number
  until?: number
  /** Compiled tag filters: tag char (e.g. "e", "p") → Set of allowed values */
  tags: Array<[string, Set<string>]>
}

/**
 * Cache compiled filters keyed by the filter object identity.
 * Filters are frequently rebuilt as fresh objects, so a WeakMap keeps the
 * cache from leaking while still amortising compilation across repeated
 * matches against the same object.
 */
const compiledCache = new WeakMap<ReqFilter, CompiledFilter>()

function compileFilter(filter: ReqFilter): CompiledFilter {
  const cached = compiledCache.get(filter)
  if (cached) return cached

  const tags: Array<[string, Set<string>]> = []
  for (const [k, v] of Object.entries(filter)) {
    if (k.length === 2 && k[0] === "#" && Array.isArray(v)) {
      tags.push([k[1], new Set(v as Array<string>)])
    }
  }

  const compiled: CompiledFilter = {
    ids: filter.ids ? new Set(filter.ids) : undefined,
    authors: filter.authors ? new Set(filter.authors) : undefined,
    kinds: filter.kinds ? new Set(filter.kinds) : undefined,
    since: filter.since,
    until: filter.until,
    tags,
  }
  compiledCache.set(filter, compiled)
  return compiled
}

export function eventMatchesFilter(ev: NostrEvent, filter: ReqFilter) {
  const c = compileFilter(filter)
  if (c.since && ev.created_at < c.since) {
    return false
  }
  if (c.until && ev.created_at > c.until) {
    return false
  }
  if (c.ids && !c.ids.has(ev.id)) {
    return false
  }
  if (c.authors && !c.authors.has(ev.pubkey)) {
    return false
  }
  if (c.kinds && !c.kinds.has(ev.kind)) {
    return false
  }
  // Tag filters (#e, #p, #t, #d, #r, ...). An event matches a tag filter if it
  // has at least one tag of the given kind whose value is in the allowed set.
  for (const [tagChar, allowed] of c.tags) {
    if (allowed.size === 0) continue
    const has = ev.tags.some(t => t[0] === tagChar && allowed.has(t[1]))
    if (!has) {
      return false
    }
  }
  return true
}

export function isRequestSatisfied(filter: ReqFilter, results: Array<TaggedNostrEvent>) {
  if (filter.ids) {
    const have = new Set(results.map(a => a.id))
    return filter.ids.every(a => have.has(a))
  }
  return false
}
