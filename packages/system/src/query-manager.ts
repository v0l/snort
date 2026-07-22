import { unixNow } from "@snort/shared"
import debug from "debug"
import { EventEmitter } from "eventemitter3"
import {
  type BuiltRawReqFilter,
  DefaultRelays,
  Nips,
  type ReqFilter,
  type RequestBuilder,
  type SystemInterface,
  type TaggedNostrEvent,
} from "."
import type { ConnectionType } from "./connection-pool"
import { FetchAllGracePeriod, QueryFetchTimeout } from "./const"
import { EventExt } from "./event-ext"
import { NegentropyFlow } from "./negentropy/negentropy-flow"
import { NoteCollection } from "./note-collection"
import { Query, QueryTrace, type QueryTraceEvent } from "./query"
import type { SyncStateStore } from "./cache-relay"
import { computeSyncState, getSyncDimension, planFilterSync, type SyncRecordPending, syncStateKey } from "./query-sync"
import { eventMatchesFilter, isRequestSatisfied } from "./request-matcher"
import { trimFilters } from "./request-trim"
import { RangeSync } from "./sync/range-sync"

interface QueryManagerEvents {
  change: () => void
  trace: (event: QueryTraceEvent, queryName?: string) => void
  request: (subId: string, req: BuiltRawReqFilter) => void
}

interface PendingTrace {
  query: Query
  trace: QueryTrace
  connection: ConnectionType
  filters: BuiltRawReqFilter
}

interface TraceRoute {
  query: Query
  trace: QueryTrace
  connection: ConnectionType
}

/**
 * Query manager handles sending requests to the nostr network
 */
export class QueryManager extends EventEmitter<QueryManagerEvents> {
  #log = debug("QueryManager")

  /**
   * All active queries
   */
  #queries: Map<string, Query> = new Map()

  /**
   * Pending traces waiting for connection availability
   */
  #pendingTraces: Array<PendingTrace> = []

  /**
   * Routing table: subscription id (trace.id) → owning query/trace/connection.
   * A single pool "event" listener dispatches through this map in O(1),
   * instead of registering one pool listener per trace (which made event
   * dispatch O(events × traces) and leaked listeners on long-lived queries).
   */
  #traceRouting: Map<string, TraceRoute> = new Map()

  /**
   * Connections we've already attached eose/closed listeners to.
   * Connection objects persist across reconnects, so one listener each is
   * enough and stays bounded by the number of relays.
   */
  #connListenersAttached: WeakSet<ConnectionType> = new WeakSet()

  /**
   * System interface handle
   */
  #system: SystemInterface

  /**
   * Map tracking which connections have had retry listeners attached to prevent duplicates
   */
  #connectionListeners: Set<string> = new Set()

  /**
   * Handle for the cleanup interval so it can be cleared on destroy()
   */
  #cleanupInterval?: ReturnType<typeof setInterval>

  constructor(system: SystemInterface) {
    super()
    this.#system = system

    // Set up global connection listeners for cleanup
    this.#setupConnectionListeners()

    // Single pool-level event listener — dispatches via #traceRouting.
    this.#system.pool.on("event", this.#onPoolEvent)
  }

  /**
   * Ensure the periodic cleanup timer is running. Started lazily when queries
   * exist and stopped again once the query set empties, so an idle system
   * isn't holding a wakeup every second.
   */
  #ensureCleanupRunning() {
    if (!this.#cleanupInterval) {
      this.#cleanupInterval = setInterval(() => this.#cleanup(), 1_000)
    }
  }

  /**
   * Central pool event handler. Routes an incoming event to the owning query
   * using the trace-id → query map.
   */
  #onPoolEvent = (_addr: string, sub: string, ev: TaggedNostrEvent) => {
    const route = this.#traceRouting.get(sub)
    if (route) {
      route.query.addEvent(sub, ev)
    }
  }

  /**
   * Stop all timers and remove all listeners.
   * Call this when the QueryManager is no longer needed to prevent leaks.
   */
  destroy() {
    if (this.#cleanupInterval) {
      clearInterval(this.#cleanupInterval)
      this.#cleanupInterval = undefined
    }
    this.#system.pool.off("event", this.#onPoolEvent)
    for (const [, q] of this.#queries) {
      q.cancel()
    }
    this.#queries.clear()
    this.#traceRouting.clear()
    this.removeAllListeners()
  }

  #setupConnectionListeners() {
    // Listen for new connections to retry pending traces
    this.#system.pool.on("connected", address => {
      const conn = this.#system.pool.getConnection(address)
      if (conn) {
        this.#connectionListeners.delete(conn.id)
        // Retry immediately — the connection is now open
        this.#retryPendingTraces(conn)
      }
    })

    // Clean up traces when connection disconnects
    this.#system.pool.on("disconnect", address => {
      const conn = this.#system.pool.getConnection(address)
      if (conn) {
        this.#connectionListeners.delete(conn.id)
        this.#pendingTraces = this.#pendingTraces.filter(p => p.connection.id !== conn.id)

        // Mark all traces for this connection as dropped and drop their routes
        for (const [_, query] of this.#queries) {
          for (const trace of query.traces) {
            if (trace.connId === conn.id && !trace.finished) {
              trace.drop()
              this.#traceRouting.delete(trace.id)
            }
          }
        }
      }
    })
  }

  get(id: string) {
    return this.#queries.get(id)
  }

  /**
   * Compute query to send to relays
   */
  query(req: RequestBuilder): Query {
    this.#ensureCleanupRunning()
    const existing = this.#queries.get(req.id)
    if (existing) {
      existing.uncancel() // keep alive — new subscriber
      if (existing.addRequest(req)) {
        existing.start() // start emit again
        this.emit("change")
      }
      return existing
    } else {
      const q = new Query(req)
      q.on("trace", e => {
        this.emit("trace", e, req.id)
      })
      q.on("request", (_id, fx) => {
        this.#send(q, fx)
      })
      q.on("end", () => {
        // Drop this query's routes so the central pool listener stops
        // dispatching to it.
        for (const tr of q.traces) {
          this.#traceRouting.delete(tr.id)
        }
        q.off("trace")
        q.off("request")
      })

      this.#queries.set(req.id, q)
      if (req.numFilters > 0) {
        this.emit("change")
      }
      return q
    }
  }

  /**
   * Manually insert events into query result set
   */
  handleEvent(sub: string, ev: TaggedNostrEvent) {
    this.#queries.forEach(q => q.addEvent(sub, ev))
  }

  /**
   * Async fetch results.
   * Relays race: the query's internal grace period times out slow traces
   * after the first EOSE, so this resolves quickly in practice.
   */
  async fetch(req: RequestBuilder, cb?: (evs: Array<TaggedNostrEvent>) => void) {
    req.withOptions({ groupingDelay: 0 }) //disable grouping timer
    const filters = req.buildRaw()
    const q = this.query(req)
    if (cb) {
      q.on("event", cb)
    }

    q.start()

    // Wait for the query-level eose (fires after grace period)
    await new Promise<void>((resolve, reject) => {
      const hardTimeout = setTimeout(() => {
        reject(
          new Error(
            `QueryManager.fetch() timed out after ${QueryFetchTimeout}ms — EOSE never received for "${req.id}"`,
          ),
        )
      }, QueryFetchTimeout + FetchAllGracePeriod)

      q.once("eose", () => {
        clearTimeout(hardTimeout)
        resolve()
      })
    })

    const results = q.feed.takeSnapshot()
    if (cb) {
      q.flush()
      q.off("event", cb)
    }
    return results.filter(a => filters.some(b => eventMatchesFilter(a, b)))
  }

  /**
   * Wait for queries to collect enough data for SSR.
   * Relays race: the Query's internal grace period times out slow traces
   * after the first EOSE, so this resolves quickly in practice.
   * Skips queries marked with `leaveOpen: true`.
   */
  async fetchAll(): Promise<void> {
    const queries = [...this.#queries.values()].filter(q => !q.leaveOpen)
    if (queries.length === 0) return

    // During SSR, queries may have been created (via system.Query) but never
    // started because useSyncExternalStore's subscribe callback isn't invoked.
    // Force-start them so FetchAll has traces to wait on.
    queries.forEach(q => q.start())

    const promises = queries.map(q => {
      return new Promise<void>((resolve, reject) => {
        // Already finished?
        if (q.traces.length > 0 && q.traces.every(tr => tr.finished)) {
          resolve()
          return
        }

        const hardTimeout = setTimeout(() => {
          reject(new Error(`fetchAll() timed out after ${QueryFetchTimeout}ms for query "${q.id}"`))
        }, QueryFetchTimeout + FetchAllGracePeriod)

        q.once("eose", () => {
          clearTimeout(hardTimeout)
          resolve()
        })
      })
    })

    await Promise.all(promises)
  }

  *[Symbol.iterator]() {
    for (const kv of this.#queries) {
      yield kv
    }
  }

  async #send(q: Query, filters: Array<ReqFilter>) {
    // check for empty filters
    filters = trimFilters(filters)

    if (filters.length === 0) {
      this.#log("Dropping %s %o", q.id)
      return
    }

    // automated outbox model, load relays for queried authors
    for (const f of filters) {
      if (f.authors) {
        this.#system.relayLoader.TrackKeys(f.authors)
      }
    }

    let syncFrom: Array<TaggedNostrEvent> | undefined
    // fetch results from cache first, flag qSend for sync
    if (this.#system.cacheRelay && !q.skipCache) {
      const data = await this.#system.cacheRelay.query(["REQ", q.id, ...filters])
      syncFrom = data
      if (data.length > 0) {
        this.#log("Adding from cache %s %O", q.id, data)
        q.feed.add(data)
      }
    }

    // remove satisfied filters
    if ((syncFrom?.length ?? 0) > 0) {
      // only remove the "ids" filters
      const newFilters = filters.filter(a => !isRequestSatisfied(a, syncFrom!))
      if (newFilters.length !== filters.length) {
        this.#log("Removing satisfied filters %o %o", newFilters, filters)
        filters = newFilters
      }
    }

    // nothing left to send
    if (filters.length === 0) {
      this.#log("Dropping %s, all filters are satisfied", q.id)
      // Emit EOSE to unblock any pending fetch() calls
      q.emit("eose")
      return
    }

    // Apply sync coverage (watermarks) pre-routing: rewrite eligible filters
    // into deltas against EOSE-proven windows, drop fully-covered ones.
    // Gated on the cache relay exposing syncState (same-store rule).
    const syncStore = !q.skipCache ? this.#system.cacheRelay?.syncState : undefined
    if (syncStore) {
      filters = await this.#applySyncCoverage(q, filters, syncStore)
      if (filters.length === 0) {
        this.#log("Dropping %s, all filters covered by sync state", q.id)
        q.emit("eose")
        return
      }
    }

    if (this.#system.requestRouter) {
      filters = this.#system.requestRouter.forAllRequest(filters)
    }

    const compressed = this.#system.optimizer.compress(filters).reduce(
      (acc, v) => {
        for (const r of v.relays ?? [""]) {
          acc[r] ??= []
          acc[r].push(v)
        }
        return acc
      },
      {} as Record<string, Array<ReqFilter>>,
    )
    const qSend = Object.entries(compressed).map(([k, v]) => {
      return {
        relay: k,
        filters: v,
        syncFrom: this.#system.config.disableSyncModule || !q.useSyncModule ? undefined : syncFrom,
      } as BuiltRawReqFilter
    })
    // Fire all relay sends — #sendToRelays connects non-blocking and
    // creates traces as connections become available.
    for (const a of qSend) {
      this.#sendToRelays(q, a)
    }
  }

  /**
   * Rewrite filters using stored sync coverage: known dimension values get
   * delta `since` (or are dropped when fully covered), fresh values get a
   * full fetch. Schedules watermark advancement on query EOSE.
   */
  async #applySyncCoverage(q: Query, filters: Array<ReqFilter>, store: SyncStateStore): Promise<Array<ReqFilter>> {
    const send: Array<ReqFilter> = []
    const records: Array<SyncRecordPending> = []
    const now = unixNow()
    for (const f of filters) {
      const dim = getSyncDimension(f)
      if (!dim) {
        send.push(f)
        continue
      }
      const key = syncStateKey(q.syncId ?? q.id, dim, f)
      let st: Awaited<ReturnType<SyncStateStore["get"]>>
      try {
        st = await store.get(key)
      } catch (e) {
        this.#log("Failed to read sync state %s: %O", key, e)
      }
      const plan = planFilterSync(f, dim, st, key, now)
      if (st) {
        this.#log(
          "Sync coverage %s: state=[%d..%d, %d values], %d filter(s) -> %d send",
          key,
          st.since,
          st.until,
          st.values.length,
          1,
          plan.send.length,
        )
      }
      send.push(...plan.send)
      records.push(...plan.records)
    }
    if (records.length > 0) {
      this.#scheduleSyncRecord(q, records, store)
    }
    return send
  }

  /**
   * Advance sync watermarks once the query reaches EOSE (or ends).
   */
  #scheduleSyncRecord(q: Query, records: Array<SyncRecordPending>, store: SyncStateStore) {
    let done = false
    const record = () => {
      if (done) return
      done = true
      const feed = q.feed.snapshot
      const now = unixNow()
      const byKey = new Map<string, Array<SyncRecordPending>>()
      for (const r of records) {
        const list = byKey.get(r.key)
        if (list) {
          list.push(r)
        } else {
          byKey.set(r.key, [r])
        }
      }
      for (const [key, group] of byKey) {
        const next = computeSyncState(group, feed, now)
        if (next) {
          this.#log("Sync record %s: [%d..%d, %d values]", key, next.since, next.until, next.values.length)
          store.set(key, next).catch(e => this.#log("Failed to write sync state %s: %O", key, e))
        }
      }
    }
    q.once("eose", record)
    q.once("end", record)
  }

  /**
   * Check if query can be sent to this connection
   */
  #canSendQuery(c: ConnectionType, q: BuiltRawReqFilter, query: Query) {
    // query is not for this relay
    if (q.relay && q.relay !== c.address) {
      return false
    }
    // connection is down, dont send
    if (c.isDown) {
      return false
    }
    // cannot send unless relay is tagged on ephemeral relay connection
    if (!q.relay && c.ephemeral) {
      this.#log("Cant send non-specific REQ to ephemeral connection %O %O %O", q, q.relay, c)
      return false
    }
    // Search queries must only go to relays known to support NIP-50. Sending a
    // search filter to a relay that doesn't advertise NIP-50 makes it ignore
    // `search` and return everything — so require advertised support. This also
    // guards against firing search REQs before the relay's NIP-11 doc loads.
    if (q.filters.some(a => a.search) && !(c.info?.supported_nips?.includes(Nips.Search) ?? false)) {
      this.#log("Cant send search REQ to relay without known NIP-50 support", c.address)
      return false
    }
    // query already closed, cant send
    if (query.canRemove()) {
      this.#log("Cant send REQ when query is closed", query.id, q)
      return false
    }
    return true
  }

  /**
   * Create a new trace for a query and connection
   */
  createTrace(query: Query, connection: ConnectionType, filters: BuiltRawReqFilter): QueryTrace {
    const trace = new QueryTrace(connection.address, filters.filters, connection.id, query.leaveOpen)

    // Register in the routing table (dispatched by the single pool listener).
    this.#traceRouting.set(trace.id, { query, trace, connection })
    // Attach per-connection eose/closed listeners once.
    this.#ensureConnectionListeners(connection)

    return trace
  }

  /**
   * Attach eose/closed listeners to a connection exactly once. Routing is done
   * via #traceRouting so a single pair of listeners serves all traces on the
   * connection instead of one pair per trace.
   */
  #ensureConnectionListeners(connection: ConnectionType) {
    if (this.#connListenersAttached.has(connection)) return
    this.#connListenersAttached.add(connection)

    connection.on("eose", sub => this.#onConnectionEose(connection, sub))
    connection.on("closed", sub => this.#onConnectionClosed(connection, sub))
  }

  #onConnectionEose(connection: ConnectionType, sub: string) {
    const route = this.#traceRouting.get(sub)
    if (route && route.connection === connection) {
      route.trace.eose()
      if (!route.trace.leaveOpen) {
        // Delete route first so the re-entrant "eose" emitted by closeRequest
        // is a no-op.
        this.#traceRouting.delete(sub)
        route.trace.close()
        connection.closeRequest(route.trace.id)
      }
    }
    // A subscription slot may have freed — flush any queued traces.
    this.#retryPendingTraces(connection)
  }

  #onConnectionClosed(connection: ConnectionType, sub: string) {
    const route = this.#traceRouting.get(sub)
    if (route && route.connection === connection) {
      route.trace.remoteClosed()
      this.#traceRouting.delete(sub)
    }
    // A subscription slot may have freed — flush any queued traces.
    this.#retryPendingTraces(connection)
  }

  /**
   * Attempt to send a trace to a connection
   * @returns true if sent, false if queued
   */
  sendTrace(query: Query, trace: QueryTrace, connection: ConnectionType, filters: BuiltRawReqFilter): boolean {
    trace.queued()

    // Queue if the connection is not yet open — will be retried on 'connected'
    if (!connection.isOpen) {
      this.#pendingTraces.push({ query, trace, connection, filters })
      this.#log("Query queued for %s (not yet open): %O", connection.address, filters)
      return false
    }

    // Check if connection can handle more subscriptions
    if (connection.activeSubscriptions >= connection.maxSubscriptions) {
      this.#pendingTraces.push({ query, trace, connection, filters })
      this.#log("Query queued for %s (at max subscriptions): %O", connection.address, filters)
      return false
    }

    // Normalize filters
    const normalizedFilters = filters.filters.map(a => {
      const copy = { ...a }
      delete copy["relays"]
      return copy
    })

    if (filters.syncFrom !== undefined && !this.#system.config.disableSyncModule) {
      // Handle SYNC command - use sync logic
      this.#handleSync(trace, connection, filters.syncFrom, normalizedFilters)
    } else {
      connection.request(["REQ", trace.id, ...normalizedFilters], () => trace.sent())
    }

    this.#log(
      "Sent query %s to %s %s (streaming=%s) %O",
      trace.id,
      connection.address,
      query.id,
      query.leaveOpen,
      filters,
    )
    return true
  }

  /**
   * Handle SYNC command using negentropy or fallback
   */
  #handleSync(
    trace: QueryTrace,
    connection: ConnectionType,
    eventSet: Array<TaggedNostrEvent>,
    filters: Array<ReqFilter>,
  ) {
    if ((connection.info?.negentropy ?? NaN) >= 1) {
      // Use negentropy sync
      const neg = new NegentropyFlow(trace.id, connection, eventSet, filters)
      neg.once("finish", newFilters => {
        if (newFilters.length > 0) {
          // Send request for missing event ids
          connection.request(["REQ", trace.id, ...newFilters])
        } else {
          // no results to query, emulate closed
          connection.emit("closed", trace.id, "Nothing to sync")
        }
      })
      neg.once("error", () => {
        this.#fallbackSync(trace, connection, eventSet, filters)
      })
      neg.start()
      trace.sentSync()
    } else {
      // No negentropy support, use fallback
      this.#fallbackSync(trace, connection, eventSet, filters)
    }
  }

  /**
   * Fallback sync methods when negentropy is not available
   */
  #fallbackSync(
    trace: QueryTrace,
    connection: ConnectionType,
    eventSet: Array<TaggedNostrEvent>,
    filters: Array<ReqFilter>,
  ) {
    // Signal sync fallback to trace
    trace.syncFallback()

    // if the event is replaceable there is no need to use any special sync query,
    // just send the filters directly
    const isReplaceableSync = filters.every(a => a.kinds?.every(b => EventExt.isReplaceable(b) ?? false))
    if (filters.some(a => a.since || a.until || a.ids || a.limit) || isReplaceableSync) {
      connection.request(["REQ", trace.id, ...filters], () => trace.sent())
    } else if (this.#system.config.fallbackSync === "since") {
      this.#syncSince(trace, connection, eventSet, filters)
    } else if (this.#system.config.fallbackSync === "range-sync") {
      this.#syncRangeSync(trace, connection, eventSet, filters)
    } else {
      throw new Error("No fallback sync method")
    }
  }

  /**
   * Using the latest data, fetch only newer items
   */
  #syncSince(
    trace: QueryTrace,
    connection: ConnectionType,
    eventSet: Array<TaggedNostrEvent>,
    filters: Array<ReqFilter>,
  ) {
    const latest = eventSet.reduce((acc, v) => (acc = v.created_at > acc ? v.created_at : acc), 0)
    const newFilters = filters.map(a => {
      if (a.since || latest === 0) return a
      return {
        ...a,
        since: latest + 1,
      }
    })
    connection.request(["REQ", trace.id, ...newFilters], () => trace.sent())
  }

  /**
   * Using the RangeSync class, sync data using fixed window size
   */
  #syncRangeSync(
    trace: QueryTrace,
    connection: ConnectionType,
    eventSet: Array<TaggedNostrEvent>,
    filters: Array<ReqFilter>,
  ) {
    const rs = RangeSync.forFetcher(async (rb, cb) => {
      return await new Promise((resolve, reject) => {
        const results = new NoteCollection()
        const f = rb.buildRaw()
        connection.on("unverifiedEvent", (c, e) => {
          if (rb.id === c) {
            cb?.([e])
            results.add(e)
          }
        })
        connection.on("eose", s => {
          if (s === rb.id) {
            resolve(results.takeSnapshot())
          }
        })
        connection.request(["REQ", rb.id, ...f], undefined)
      })
    })
    const latest = eventSet.reduce((acc, v) => (acc = v.created_at > acc ? v.created_at : acc), 0)
    rs.setStartPoint(latest + 1)
    rs.on("event", ev => {
      ev.forEach(e => connection.emit("unverifiedEvent", trace.id, e))
    })
    for (const f of filters) {
      rs.sync(f)
    }
  }

  /**
   * Retry pending traces for a connection
   */
  #retryPendingTraces(connection: ConnectionType) {
    const pending = this.#pendingTraces.filter(p => p.connection.id === connection.id)
    for (const p of pending) {
      const sent = this.sendTrace(p.query, p.trace, p.connection, p.filters)
      if (sent) {
        // Remove from queue
        this.#pendingTraces = this.#pendingTraces.filter(pt => pt !== p)
      } else {
        // Still can't send, stop trying
        break
      }
    }
  }

  #sendToRelays(q: Query, qSend: BuiltRawReqFilter) {
    if (qSend.relay) {
      // Start connecting — don't await. Create the trace immediately so the
      // query has visibility even if NIP-11 or the WebSocket handshake is slow.
      // sendTrace will queue the trace in #pendingTraces if the connection
      // isn't open yet, and it'll be retried when the pool fires "connected".
      this.#system.pool.connect(qSend.relay, { read: true, write: true }, true).then(async nc => {
        // Search queries depend on NIP-50 support, which is only known after the
        // NIP-11 doc loads (in parallel with the WS handshake). Wait for it so
        // targeted search REQs aren't dropped by #canSendQuery on a cold relay.
        if (nc && nc.infoReady && qSend.filters.some(f => f.search)) {
          await nc.infoReady
        }
        if (nc && this.#canSendQuery(nc, qSend, q)) {
          const trace = this.createTrace(q, nc, qSend)
          q.addTrace(trace)
          this.sendTrace(q, trace, nc, qSend)
        } else {
          this.#log("Cannot send query to %s: %s", qSend.relay, nc ? "validation failed" : "connect failed")
        }
      })
    } else {
      const ret = []
      for (const [a, s] of this.#system.pool) {
        if (!s.ephemeral) {
          if (this.#canSendQuery(s, qSend, q)) {
            const trace = this.createTrace(q, s, qSend)
            q.addTrace(trace)
            this.sendTrace(q, trace, s, qSend)
            ret.push(trace)
          } else {
            this.#log("Cannot send query to %s: validation failed", a)
          }
        }
      }
      // If no relays in pool, connect to default relays (non-ephemeral so #canSendQuery accepts them)
      if (ret.length === 0) {
        this.#log("No relays connected, using defaults")
        // Fire all connects in parallel — each creates a trace as it resolves
        for (const relayUrl of DefaultRelays) {
          this.#system.pool.connect(relayUrl, { read: true, write: false }, false).then(nc => {
            if (nc && this.#canSendQuery(nc, qSend, q)) {
              const trace = this.createTrace(q, nc, qSend)
              q.addTrace(trace)
              this.sendTrace(q, trace, nc, qSend)
            }
          })
        }
      }
    }

    this.emit("request", q.id, qSend)
  }

  #cleanup() {
    let changed = false
    for (const [k, v] of this.#queries) {
      if (v.canRemove()) {
        for (const tr of v.traces) {
          this.#traceRouting.delete(tr.id)
        }
        v.closeQuery()
        this.#queries.delete(k)
        this.#log("Deleted query %s", k)
        changed = true
      }
    }
    // Stop the timer while idle; #ensureCleanupRunning restarts it lazily.
    if (this.#queries.size === 0 && this.#cleanupInterval) {
      clearInterval(this.#cleanupInterval)
      this.#cleanupInterval = undefined
    }
    if (changed) {
      this.emit("change")
    }
  }
}
