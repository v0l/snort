import type { OkResponse, ReqCommand, TaggedNostrEvent } from "./nostr"

/**
 * EOSE-proven sync coverage for a query dimension.
 *
 * Records that, for `kinds` × `values` (of `dimension`), the local store holds
 * complete data for the time window [since, until] — proven by relay EOSE, not
 * merely by possession of events.
 */
export interface QuerySyncState {
  version: 1
  /** Sorted kinds of the source filter */
  kinds: Array<number>
  /** Discriminating array dimension: "authors", "#t", "#p", ... or "" for kinds-only filters */
  dimension: string
  /** Known values of the dimension (authors/tag values) covered by this state */
  values: Array<string>
  /** Covered window lower bound (unix seconds) */
  since: number
  /** Covered window upper bound (unix seconds) */
  until: number
}

/**
 * Optional sync-state storage capability of a cache relay.
 *
 * IMPORTANT: implementations MUST store this state in the same store as the
 * events themselves, with the same lifetime. Storing sync state separately
 * from the events (e.g. localStorage while events live in OPFS) risks
 * permanent data gaps when one store is wiped and the other survives.
 */
export interface SyncStateStore {
  get(key: string): Promise<QuerySyncState | undefined>
  set(key: string, state: QuerySyncState): Promise<void>
}

/**
 * A cache relay is an always available local (local network / browser worker) relay
 * Which should contain all of the content we're looking for and respond quickly.
 */
export interface CacheRelay {
  /**
   * Write event to cache relay
   */
  event(ev: TaggedNostrEvent): Promise<OkResponse>

  /**
   * Read event from cache relay
   */
  query(req: ReqCommand): Promise<Array<TaggedNostrEvent>>

  /**
   * Delete events by filter
   */
  delete(req: ReqCommand): Promise<Array<string>>

  /**
   * Optional sync-state storage. When present, the query system uses
   * EOSE-proven coverage windows to rewrite filters into deltas
   * (`since` watermarks) and skip fully-covered requests.
   */
  syncState?: SyncStateStore
}
