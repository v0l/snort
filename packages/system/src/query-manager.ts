import debug from "debug";
import { EventEmitter } from "eventemitter3";
import { BuiltRawReqFilter, Nips, ReqFilter, RequestBuilder, SystemInterface, TaggedNostrEvent } from ".";
import { Query, QueryTrace, QueryTraceEvent } from "./query";
import { trimFilters } from "./request-trim";
import { eventMatchesFilter, isRequestSatisfied } from "./request-matcher";
import { ConnectionType } from "./connection-pool";
import { EventExt } from "./event-ext";
import { NegentropyFlow } from "./negentropy/negentropy-flow";
import { RangeSync } from "./sync/range-sync";
import { NoteCollection } from "./note-collection";
import { unixNowMs } from "@snort/shared";

interface QueryManagerEvents {
  change: () => void;
  trace: (event: QueryTraceEvent, queryName?: string) => void;
  request: (subId: string, req: BuiltRawReqFilter) => void;
}

interface PendingTrace {
  query: Query;
  trace: QueryTrace;
  connection: ConnectionType;
  filters: BuiltRawReqFilter;
}

/**
 * Query manager handles sending requests to the nostr network
 */
export class QueryManager extends EventEmitter<QueryManagerEvents> {
  #log = debug("QueryManager");

  /**
   * All active queries
   */
  #queries: Map<string, Query> = new Map();

  /**
   * Pending traces waiting for connection availability
   */
  #pendingTraces: Array<PendingTrace> = [];

  /**
   * System interface handle
   */
  #system: SystemInterface;

  /**
   * Map tracking which connections have change listeners to prevent duplicates
   */
  #connectionListeners: Set<string> = new Set();

  constructor(system: SystemInterface) {
    super();
    this.#system = system;

    // Set up global connection listeners for cleanup
    this.#setupConnectionListeners();

    setInterval(() => this.#cleanup(), 1_000);
  }

  #setupConnectionListeners() {
    // Listen for new connections to setup retry logic
    this.#system.pool.on("connected", address => {
      const conn = this.#system.pool.getConnection(address);
      if (conn && !this.#connectionListeners.has(conn.id)) {
        this.#connectionListeners.add(conn.id);

        const changeHandler = () => {
          this.#retryPendingTraces(conn);
        };

        conn.once("change", changeHandler);
      }
    });

    // Clean up traces when connection disconnects
    this.#system.pool.on("disconnect", address => {
      const conn = this.#system.pool.getConnection(address);
      if (conn) {
        this.#connectionListeners.delete(conn.id);
        this.#pendingTraces = this.#pendingTraces.filter(p => p.connection.id !== conn.id);

        // Mark all traces for this connection as dropped
        for (const [_, query] of this.#queries) {
          for (const trace of query.traces) {
            if (trace.connId === conn.id && !trace.finished) {
              trace.drop();
            }
          }
        }
      }
    });
  }

  get(id: string) {
    return this.#queries.get(id);
  }

  /**
   * Compute query to send to relays
   */
  query(req: RequestBuilder): Query {
    const existing = this.#queries.get(req.id);
    if (existing) {
      if (existing.addRequest(req)) {
        this.emit("change");
      }
      return existing;
    } else {
      const q = new Query(req);
      q.on("trace", event => this.emit("trace", event, req.id));
      q.on("request", (_id, fx) => {
        this.#send(q, fx);
      });

      this.#queries.set(req.id, q);
      if (req.numFilters > 0) {
        this.emit("change");
      }
      q.start();
      return q;
    }
  }

  /**
   * Manually insert events into query result set
   */
  handleEvent(sub: string, ev: TaggedNostrEvent) {
    this.#queries.forEach(q => q.addEvent(sub, ev));
  }

  /**
   * Async fetch results
   */
  async fetch(req: RequestBuilder, cb?: (evs: Array<TaggedNostrEvent>) => void) {
    const filters = req.buildRaw();
    const q = this.query(req);
    if (cb) {
      q.on("event", cb);
    }
    await new Promise<void>(resolve => {
      q.once("done", resolve);
    });
    const results = q.feed.takeSnapshot();
    if (cb) {
      q.off("event", cb);
    }
    return results.filter(a => filters.some(b => eventMatchesFilter(a, b)));
  }

  *[Symbol.iterator]() {
    for (const kv of this.#queries) {
      yield kv;
    }
  }

  async #send(q: Query, filters: Array<ReqFilter>) {
    // check for empty filters
    filters = trimFilters(filters);

    if (filters.length === 0) {
      this.#log("Dropping %s %o", q.id);
      return;
    }

    // automated outbox model, load relays for queried authors
    for (const f of filters) {
      if (f.authors) {
        this.#system.relayLoader.TrackKeys(f.authors);
      }
    }

    let syncFrom: Array<TaggedNostrEvent> | undefined;
    // fetch results from cache first, flag qSend for sync
    if (this.#system.cacheRelay && !q.skipCache) {
      const data = await this.#system.cacheRelay.query(["REQ", q.id, ...filters]);
      syncFrom = data;
      if (data.length > 0) {
        this.#log("Adding from cache %s %O", q.id, data);
        q.feed.add(data);
      }
    }

    // remove satisfied filters
    if ((syncFrom?.length ?? 0) > 0) {
      // only remove the "ids" filters
      const newFilters = filters.filter(a => !isRequestSatisfied(a, syncFrom!));
      if (newFilters.length !== filters.length) {
        this.#log("Removing satisfied filters %o %o", newFilters, filters);
        filters = newFilters;
      }
    }

    // nothing left to send
    if (filters.length === 0) {
      this.#log("Dropping %s, all filters are satisfied", q.id);
      return;
    }

    if (this.#system.requestRouter) {
      filters = this.#system.requestRouter.forAllRequest(filters);
    }

    const compressed = this.#system.optimizer.compress(filters).reduce(
      (acc, v) => {
        for (const r of v.relays ?? [""]) {
          acc[r] ??= [];
          acc[r].push(v);
        }
        return acc;
      },
      {} as Record<string, Array<ReqFilter>>,
    );
    const qSend = Object.entries(compressed).map(([k, v]) => {
      return {
        relay: k,
        filters: v,
        syncFrom: this.#system.config.disableSyncModule || !q.useSyncModule ? undefined : syncFrom,
      } as BuiltRawReqFilter;
    });
    await Promise.all(qSend.map(a => this.#sendToRelays(q, a)));
  }

  /**
   * Check if query can be sent to this connection
   */
  #canSendQuery(c: ConnectionType, q: BuiltRawReqFilter, query: Query) {
    // query is not for this relay
    if (q.relay && q.relay !== c.address) {
      return false;
    }
    // connection is down, dont send
    if (c.isDown) {
      return false;
    }
    // cannot send unless relay is tagged on ephemeral relay connection
    if (!q.relay && c.ephemeral) {
      this.#log("Cant send non-specific REQ to ephemeral connection %O %O %O", q, q.relay, c);
      return false;
    }
    // search not supported, cant send
    if (q.filters.some(a => a.search) && !c.info?.supported_nips?.includes(Nips.Search)) {
      this.#log("Cant send REQ to non-search relay", c.address);
      return false;
    }
    // query already closed, cant send
    if (query.canRemove()) {
      this.#log("Cant send REQ when query is closed", query.id, q);
      return false;
    }
    return true;
  }

  /**
   * Create a new trace for a query and connection
   */
  createTrace(query: Query, connection: ConnectionType, filters: BuiltRawReqFilter): QueryTrace {
    const trace = new QueryTrace(connection.address, filters.filters, connection.id, query.leaveOpen);

    // Set up event listeners for this trace
    const eventHandler = (_relay: string, sub: string, ev: TaggedNostrEvent) => {
      if (trace.id === sub) {
        query.addEvent(sub, ev);
      }
    };

    const eoseHandler = (sub: string) => {
      if (trace.id === sub) {
        trace.eose();
        if (!trace.leaveOpen) {
          connection.closeRequest(trace.id);
          trace.close();
        }
      }
    };

    const closedHandler = (sub: string) => {
      if (trace.id === sub) {
        trace.remoteClosed();
      }
    };

    this.#system.pool.on("event", eventHandler);
    connection.on("eose", eoseHandler);
    connection.on("closed", closedHandler);
    query.on("end", () => {
      this.#system.pool.off("event", eventHandler);
      connection.off("eose", eoseHandler);
      connection.off("closed", closedHandler);
    });

    return trace;
  }

  /**
   * Attempt to send a trace to a connection
   * @returns true if sent, false if queued
   */
  sendTrace(query: Query, trace: QueryTrace, connection: ConnectionType, filters: BuiltRawReqFilter): boolean {
    trace.queued();

    // Check if connection can handle more subscriptions
    if (connection.activeSubscriptions >= connection.maxSubscriptions) {
      this.#pendingTraces.push({ query, trace, connection, filters });
      this.#log("Query queued for %s (at max subscriptions): %O", connection.address, filters);
      return false;
    }

    // Normalize filters
    const normalizedFilters = filters.filters.map(a => {
      const copy = { ...a };
      delete copy["relays"];
      return copy;
    });

    if (filters.syncFrom !== undefined && !this.#system.config.disableSyncModule) {
      // Handle SYNC command - use sync logic
      this.#handleSync(trace, connection, filters.syncFrom, normalizedFilters);
    } else {
      connection.request(["REQ", trace.id, ...normalizedFilters], () => trace.sent());
    }

    this.#log(
      "Sent query %s to %s %s (streaming=%s) %O",
      trace.id,
      connection.address,
      query.id,
      query.leaveOpen,
      filters,
    );
    return true;
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
      const neg = new NegentropyFlow(trace.id, connection, eventSet, filters);
      neg.once("finish", newFilters => {
        if (newFilters.length > 0) {
          // Send request for missing event ids
          connection.request(["REQ", trace.id, ...newFilters]);
        } else {
          // no results to query, emulate closed
          connection.emit("closed", trace.id, "Nothing to sync");
        }
      });
      neg.once("error", () => {
        this.#fallbackSync(trace, connection, eventSet, filters);
      });
      neg.start();
      trace.sentSync();
    } else {
      // No negentropy support, use fallback
      this.#fallbackSync(trace, connection, eventSet, filters);
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
    trace.syncFallback();

    // if the event is replaceable there is no need to use any special sync query,
    // just send the filters directly
    const isReplaceableSync = filters.every(a => a.kinds?.every(b => EventExt.isReplaceable(b) ?? false));
    if (filters.some(a => a.since || a.until || a.ids || a.limit) || isReplaceableSync) {
      connection.request(["REQ", trace.id, ...filters], () => trace.sent());
    } else if (this.#system.config.fallbackSync === "since") {
      this.#syncSince(trace, connection, eventSet, filters);
    } else if (this.#system.config.fallbackSync === "range-sync") {
      this.#syncRangeSync(trace, connection, eventSet, filters);
    } else {
      throw new Error("No fallback sync method");
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
    const latest = eventSet.reduce((acc, v) => (acc = v.created_at > acc ? v.created_at : acc), 0);
    const newFilters = filters.map(a => {
      if (a.since || latest === 0) return a;
      return {
        ...a,
        since: latest + 1,
      };
    });
    connection.request(["REQ", trace.id, ...newFilters], () => trace.sent());
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
        const results = new NoteCollection();
        const f = rb.buildRaw();
        connection.on("unverifiedEvent", (c, e) => {
          if (rb.id === c) {
            cb?.([e]);
            results.add(e);
          }
        });
        connection.on("eose", s => {
          if (s === rb.id) {
            resolve(results.takeSnapshot());
          }
        });
        connection.request(["REQ", rb.id, ...f], undefined);
      });
    });
    const latest = eventSet.reduce((acc, v) => (acc = v.created_at > acc ? v.created_at : acc), 0);
    rs.setStartPoint(latest + 1);
    rs.on("event", ev => {
      ev.forEach(e => connection.emit("unverifiedEvent", trace.id, e));
    });
    for (const f of filters) {
      rs.sync(f);
    }
  }

  /**
   * Retry pending traces for a connection
   */
  #retryPendingTraces(connection: ConnectionType) {
    const pending = this.#pendingTraces.filter(p => p.connection.id === connection.id);
    for (const p of pending) {
      const sent = this.sendTrace(p.query, p.trace, p.connection, p.filters);
      if (sent) {
        // Remove from queue
        this.#pendingTraces = this.#pendingTraces.filter(pt => pt !== p);
      } else {
        // Still can't send, stop trying
        break;
      }
    }
  }

  async #sendToRelays(q: Query, qSend: BuiltRawReqFilter) {
    if (qSend.relay) {
      const nc = await this.#system.pool.connect(qSend.relay, { read: true, write: true }, true);
      if (nc) {
        if (this.#canSendQuery(nc, qSend, q)) {
          const trace = this.createTrace(q, nc, qSend);
          q.addTrace(trace);
          this.sendTrace(q, trace, nc, qSend);
          return [trace];
        } else {
          this.#log("Cannot send query to %s: validation failed", qSend.relay);
        }
      } else {
        console.warn("Failed to connect to new relay for:", qSend.relay, q);
      }
    } else {
      const ret = [];
      for (const [a, s] of this.#system.pool) {
        if (!s.ephemeral) {
          if (this.#canSendQuery(s, qSend, q)) {
            const trace = this.createTrace(q, s, qSend);
            q.addTrace(trace);
            this.sendTrace(q, trace, s, qSend);
            ret.push(trace);
          } else {
            this.#log("Cannot send query to %s: validation failed", a);
          }
        }
      }
      return ret;
    }

    this.emit("request", q.id, qSend);
  }

  #cleanup() {
    let changed = false;
    for (const [k, v] of this.#queries) {
      if (v.canRemove()) {
        v.closeQuery();
        this.#queries.delete(k);
        this.#log("Deleted query %s", k);
        changed = true;
      } else {
        const now = unixNowMs();
        for (const trace of v.traces) {
          if (!trace.leaveOpen && !trace.finished && trace.createdAt + v.timeout < now) {
            trace.timeout();
          }
        }
      }
    }
    if (changed) {
      this.emit("change");
    }
  }
}
