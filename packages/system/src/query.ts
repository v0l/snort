import debug from "debug"
import { EventEmitter } from "eventemitter3"
import { unixNowMs } from "@snort/shared"

import type { ReqFilter, TaggedNostrEvent } from "."
import { FetchAllGracePeriod, QueryFetchTimeout } from "./const"
import { NoteCollection } from "./note-collection"
import type { RequestBuilder } from "./request-builder"
import { eventMatchesFilter } from "./request-matcher"

/**
 * Compare two values that may be arrays or scalars.
 * Two arrays are equal if they have the same items in the same order.
 * Two scalars are equal if they are strictly equal.
 * Mixed (array vs scalar) is always false.
 */
function equalArrayOrValue(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === undefined && b === undefined) return true
  if (a === undefined || b === undefined) return false
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((v, i) => v === b[i])
  }
  return false
}

export enum QueryTraceState {
  NEW = "NEW", // New state, not used trace
  QUEUED = "QUEUED", // When first created
  WAITING = "WAITING", // Waiting for relay response (sent REQ to relay, will close on EOSE)
  WAITING_STREAM = "WAITING_STREAM", // Streaming (sent REQ to relay, will stay open after EOSE)
  SYNC_WAITING = "SYNC_WAITING", // Waiting for SYNC response (sent NEG-OPEN)
  SYNC_FALLBACK = "SYNC_FALLBACK", // SYNC not supported, falling back to REQ
  EOSE = "EOSE", // Server told us there are no more results
  LOCAL_CLOSE = "LOCAL_CLOSE", // We sent close to server
  REMOTE_CLOSE = "REMOTE_CLOSE", // Server closed the request
  DROP = "DROP", // Dropped due to disconnect
  TIMEOUT = "TIMEOUT", // Closed because taking too long
}

export interface QueryTraceEvent {
  id: string
  relay: string
  connId: string
  state: QueryTraceState
  timestamp: number
  filters: Array<ReqFilter>
}

interface QueryTraceEvents {
  stateChange: (event: QueryTraceEvent) => void
}

/**
 * Tracing for relay query status - pure state machine
 */
export class QueryTrace extends EventEmitter<QueryTraceEvents> {
  readonly id: string
  readonly createdAt: number
  #currentState: QueryTraceState = QueryTraceState.NEW
  filters: Array<ReqFilter>

  constructor(
    readonly relay: string,
    filters: Array<ReqFilter>,
    readonly connId: string,
    readonly leaveOpen: boolean,
  ) {
    super()
    this.id = crypto.randomUUID()
    this.createdAt = unixNowMs()
    this.filters = filters
  }

  #setState(state: QueryTraceState) {
    // Only emit state change if the state actually changed
    if (this.#currentState === state) {
      return
    }
    this.#currentState = state
    this.emit("stateChange", {
      id: this.id,
      relay: this.relay,
      connId: this.connId,
      state: state,
      timestamp: unixNowMs(),
      filters: this.filters,
    })
  }

  get currentState() {
    return this.#currentState
  }

  queued() {
    this.#setState(QueryTraceState.QUEUED)
  }

  sent() {
    this.#setState(this.leaveOpen ? QueryTraceState.WAITING_STREAM : QueryTraceState.WAITING)
  }

  sentSync() {
    this.#setState(QueryTraceState.SYNC_WAITING)
  }

  syncFallback() {
    this.#setState(QueryTraceState.SYNC_FALLBACK)
  }

  eose() {
    this.#setState(QueryTraceState.EOSE)
  }

  remoteClosed() {
    this.#setState(QueryTraceState.REMOTE_CLOSE)
  }

  close() {
    this.#setState(QueryTraceState.LOCAL_CLOSE)
  }

  drop() {
    this.#setState(QueryTraceState.DROP)
  }

  timeout() {
    this.#setState(QueryTraceState.TIMEOUT)
  }

  /**
   * If tracing is finished
   */
  get finished() {
    return [
      QueryTraceState.EOSE,
      QueryTraceState.TIMEOUT,
      QueryTraceState.DROP,
      QueryTraceState.REMOTE_CLOSE,
      QueryTraceState.LOCAL_CLOSE,
    ].includes(this.#currentState)
  }
}

export interface QueryEvents {
  trace: (event: QueryTraceEvent) => void
  request: (subId: string, req: Array<ReqFilter>) => void
  event: (evs: Array<TaggedNostrEvent>) => void
  /**
   * Emitted when the query will be removed
   */
  end: () => void
  /**
   * Emitted when the query has either been EOSE / CLOSED / TIMEOUT
   */
  eose: () => void
}

/**
 * Active query - collects events and tracks traces
 */
export class Query extends EventEmitter<QueryEvents> {
  id: string

  /**
   * RequestBuilder instance
   */
  requests: Array<ReqFilter> = []

  /**
   * Which relays this query has already been executed on (read-only tracking)
   */
  #tracing: Map<string, QueryTrace> = new Map()

  /**
   * Leave the query open until its removed
   */
  #leaveOpen = false

  /**
   * Skip cache layer
   */
  skipCache = false

  /**
   * Use sync module for this query
   */
  useSyncModule = false

  /**
   * How long (ms) to keep the query alive after all subscribers disconnect.
   * Default: 0 (falls back to the 1s hardcoded cleanup).
   */
  #keepAlive: number

  /**
   * Time when this query can be removed
   */
  #cancelAt?: number

  /**
   * Feed object which collects events
   */
  #feed: NoteCollection

  /**
   * Milliseconds to wait before sending query (debounce)
   */
  #groupingDelay?: number

  /**
   * Timer which waits for no-change before emitting filters
   */
  #groupTimeout?: ReturnType<typeof setTimeout>

  /**
   * If the query should only every replace a previous trace on the same connection
   */
  #replaceable: boolean = false

  /**
   * List of UUID request builder instance ids appended to this query
   */
  #builderInstances: Set<string>

  /** Total number of duplicates produced by this query */
  #duplicates: number

  /**
   * Filters that have already been emitted to QueryManager for sending.
   * Used to deduplicate re-added requests when a query is reused (keepAlive / SWR).
   */
  #sentFilters: Array<ReqFilter> = []

  /**
   * Grace-period timer: started when the first trace finishes (EOSE/CLOSE/etc).
   * After this timer fires, any remaining unfinished traces are timed out,
   * which makes progress === 1 and emits the query-level "eose".
   */
  #graceTimer?: ReturnType<typeof setTimeout>

  /**
   * Hard timeout: if no trace has finished within this period, time out
   * all remaining traces so the query doesn't hang forever.
   */
  #hardTimer?: ReturnType<typeof setTimeout>

  #log = debug("Query")

  constructor(req: RequestBuilder) {
    super()
    this.id = req.id
    this.#feed = new NoteCollection()
    this.#feed.on("event", evs => this.emit("event", evs))
    this.#builderInstances = new Set([])
    this.#leaveOpen = req.options?.leaveOpen ?? false
    this.skipCache = req.options?.skipCache ?? false
    this.useSyncModule = req.options?.useSyncModule ?? false
    this.#groupingDelay = req.options?.groupingDelay ?? 100
    this.#replaceable = req.options?.replaceable ?? false
    this.#keepAlive = req.options?.keepAlive ?? 0
    this.#duplicates = 0

    this.addRequest(req)
  }

  /**
   * Adds another request to this one
   */
  addRequest(req: RequestBuilder) {
    if (this.#builderInstances.has(req.instance)) {
      return
    }
    if (req.options?.extraEvents) {
      this.#feed.add(req.options.extraEvents)
    }
    // Use the longest keepAlive from any attached request
    const reqKeepAlive = req.options?.keepAlive ?? 0
    if (reqKeepAlive > this.#keepAlive) {
      this.#keepAlive = reqKeepAlive
    }
    if (req.numFilters > 0) {
      // If existing traces already cover these filters, skip re-adding them.
      // The feed already has the data — no new relay requests needed.
      if (this.areFiltersCovered(req.buildRaw())) {
        this.#builderInstances.add(req.instance)
        return
      }
      this.#log("Add query %O to %s", req, this.id)
      this.requests.push(...req.buildRaw())
      this.#builderInstances.add(req.instance)
      return true
    }
    return false
  }

  /**
   * Check whether a set of filters has already been sent (emitted to QueryManager).
   * Returns true if every filter in `filters` matches a previously emitted filter,
   * meaning no new relay requests are needed.
   */
  areFiltersCovered(filters: Array<ReqFilter>): boolean {
    if (this.#sentFilters.length === 0) return false
    return filters.every(f => this.#sentFilters.some(sf => this.#filterEq(f, sf)))
  }

  /**
   * Compare two ReqFilters for equality.
   * Compares all matching fields but ignores `relays` (routing info, not matching criteria).
   */
  #filterEq(a: ReqFilter, b: ReqFilter): boolean {
    const keys: (keyof ReqFilter)[] = ["ids", "kinds", "authors", "since", "until", "limit", "search"]
    for (const k of keys) {
      if (!equalArrayOrValue(a[k], b[k])) return false
    }
    // Compare tag filters (#e, #p, #t, #d, #r, etc.)
    const aTags = Object.keys(a).filter(k => k.startsWith("#"))
    const bTags = Object.keys(b).filter(k => k.startsWith("#"))
    if (aTags.length !== bTags.length) return false
    for (const tag of aTags) {
      if (!bTags.includes(tag)) return false
      if (!equalArrayOrValue(a[tag], b[tag])) return false
    }
    return true
  }

  isOpen() {
    return this.#cancelAt === undefined && this.#leaveOpen
  }

  canRemove() {
    return this.#cancelAt !== undefined && this.#cancelAt < unixNowMs()
  }

  /**
   * Recompute the complete set of compressed filters from all query traces
   */
  get filters() {
    return [...this.#tracing.values()].flatMap(a => a.filters)
  }

  get feed() {
    return this.#feed
  }

  get snapshot() {
    return this.#feed.snapshot
  }

  get traces() {
    return [...this.#tracing.values()]
  }

  get leaveOpen() {
    return this.#leaveOpen
  }

  get keepAlive() {
    return this.#keepAlive
  }

  /**
   * Flush any buffered data
   */
  flush() {
    this.feed.flushEmit()
    this.#emitFilters()
  }

  /**
   * Add a trace to this query
   */
  addTrace(trace: QueryTrace) {
    this.#tracing.set(trace.id, trace)

    // Start hard timeout on first trace — ensures the query never hangs
    if (this.#tracing.size === 1 && !this.#leaveOpen) {
      this.#hardTimer = setTimeout(() => {
        this.#hardTimer = undefined
        this.#timeoutRemaining()
      }, QueryFetchTimeout)
    }

    trace.on("stateChange", event => {
      this.emit("trace", event)

      // Check if done when reaching terminal state
      if (
        [
          QueryTraceState.EOSE,
          QueryTraceState.TIMEOUT,
          QueryTraceState.DROP,
          QueryTraceState.REMOTE_CLOSE,
          QueryTraceState.LOCAL_CLOSE,
        ].includes(event.state)
      ) {
        this.#log("Trace state changed to %s, progress=%d", event.state, this.progress)

        // Start grace period when the first trace finishes
        if (!this.#leaveOpen && !this.#graceTimer) {
          this.#graceTimer = setTimeout(() => {
            this.#graceTimer = undefined
            this.#timeoutRemaining()
          }, FetchAllGracePeriod)
        }

        if (this.progress === 1) {
          this.#clearTimers()
          this.emit("eose")
        }
      }
    })
  }

  #timeoutRemaining() {
    for (const trace of this.#tracing.values()) {
      if (!trace.finished) {
        trace.timeout()
      }
    }
  }

  #clearTimers() {
    if (this.#graceTimer) {
      clearTimeout(this.#graceTimer)
      this.#graceTimer = undefined
    }
    if (this.#hardTimer) {
      clearTimeout(this.#hardTimer)
      this.#hardTimer = undefined
    }
  }

  /**
   * Remove a trace from this query
   */
  removeTrace(traceId: string) {
    this.#tracing.delete(traceId)
  }

  /**
   * Add event to feed if it matches any trace filter
   */
  addEvent(sub: string, e: TaggedNostrEvent) {
    const trace = this.#tracing.get(sub)
    if (trace || sub === "*") {
      const filters = trace ? trace.filters : this.filters
      if (filters.some(v => eventMatchesFilter(e, v))) {
        const added = this.feed.add(e)
        if (added === 0) {
          this.#duplicates++
          const ratio = this.#duplicates / this.feed.snapshot.length
          if (ratio > 2) {
            this.#log("High number of duplicates for: ", this.id, ratio, this.feed.snapshot.length)
          }
        }
      } else {
        this.#log("Event did not match filter, rejecting %O", e)
      }
    }
  }

  /**
   * This function should be called when this Query object and FeedStore is no longer needed
   */
  cancel() {
    this.#cancelAt = unixNowMs() + (this.#keepAlive > 0 ? this.#keepAlive : 1_000)
  }

  uncancel() {
    this.#cancelAt = undefined
  }

  cleanup() {
    this.#clearTimers()
    if (this.#groupTimeout) {
      clearTimeout(this.#groupTimeout)
      this.#groupTimeout = undefined
    }
    this.emit("end")
  }

  closeQuery() {
    for (const qt of this.#tracing.values()) {
      if (!qt.finished) {
        qt.close()
      }
    }
    this.cleanup()
  }

  /**
   * Get the progress to EOSE, can be used to determine when we should load more content
   */
  get progress() {
    const traces = [...this.#tracing.values()]
    const thisProgress = traces.reduce((acc, v) => (acc += v.finished ? 1 : 0), 0) / traces.length
    if (isNaN(thisProgress)) {
      return 0
    }
    return thisProgress
  }

  /**
   * Wait for all traces to reach a finished state.
   * Returns a promise that resolves when all traces are finished.
   */
  waitFinished(): Promise<void> {
    return new Promise((resolve) => {
      const checkDone = () => {
        if (this.traces.length > 0 && this.traces.every((tr) => tr.finished)) {
          this.off("trace", onTrace)
          resolve()
        }
      }

      const onTrace = () => {
        checkDone()
      }

      // Check immediately in case already finished
      if (this.traces.length > 0 && this.traces.every((tr) => tr.finished)) {
        resolve()
      } else {
        this.on("trace", onTrace)
      }
    })
  }

  /**
   * Start filter emit
   */
  start() {
    if (this.#groupingDelay) {
      if (this.#groupTimeout !== undefined) return
      this.#groupTimeout = setTimeout(() => {
        this.#emitFilters()
        this.#groupTimeout = undefined
      }, this.#groupingDelay)
    } else {
      this.#emitFilters()
    }
  }

  async #emitFilters() {
    if (this.requests.length === 0) return
    this.#log("Starting emit of %s", this.id)
    const rawFilters = [...this.requests]
    this.requests = []
    if (this.#replaceable) {
      rawFilters.push(...this.filters)
    }
    if (rawFilters.length > 0) {
      this.#sentFilters.push(...rawFilters)
      this.emit("request", this.id, rawFilters)
    }
  }
}
