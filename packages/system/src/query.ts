import { v4 as uuid } from "uuid";
import debug from "debug";
import { EventEmitter } from "eventemitter3";
import { unixNowMs } from "@snort/shared";

import { ReqFilter, TaggedNostrEvent } from ".";
import { NoteCollection } from "./note-collection";
import { RequestBuilder } from "./request-builder";
import { eventMatchesFilter } from "./request-matcher";

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
  id: string;
  relay: string;
  connId: string;
  state: QueryTraceState;
  timestamp: number;
  filters: Array<ReqFilter>;
}

interface QueryTraceEvents {
  stateChange: (event: QueryTraceEvent) => void;
}

/**
 * Tracing for relay query status - pure state machine
 */
export class QueryTrace extends EventEmitter<QueryTraceEvents> {
  readonly id: string;
  readonly createdAt: number;
  #currentState: QueryTraceState = QueryTraceState.NEW;
  filters: Array<ReqFilter>;

  constructor(
    readonly relay: string,
    filters: Array<ReqFilter>,
    readonly connId: string,
    readonly leaveOpen: boolean,
  ) {
    super();
    this.id = uuid();
    this.createdAt = unixNowMs();
    this.filters = filters;
  }

  #setState(state: QueryTraceState) {
    // Only emit state change if the state actually changed
    if (this.#currentState === state) {
      return;
    }
    this.#currentState = state;
    this.emit("stateChange", {
      id: this.id,
      relay: this.relay,
      connId: this.connId,
      state: state,
      timestamp: unixNowMs(),
      filters: this.filters,
    });
  }

  get currentState() {
    return this.#currentState;
  }

  queued() {
    this.#setState(QueryTraceState.QUEUED);
  }

  sent() {
    this.#setState(this.leaveOpen ? QueryTraceState.WAITING_STREAM : QueryTraceState.WAITING);
  }

  sentSync() {
    this.#setState(QueryTraceState.SYNC_WAITING);
  }

  syncFallback() {
    this.#setState(QueryTraceState.SYNC_FALLBACK);
  }

  eose() {
    this.#setState(QueryTraceState.EOSE);
  }

  remoteClosed() {
    this.#setState(QueryTraceState.REMOTE_CLOSE);
  }

  close() {
    this.#setState(QueryTraceState.LOCAL_CLOSE);
  }

  drop() {
    this.#setState(QueryTraceState.DROP);
  }

  timeout() {
    this.#setState(QueryTraceState.TIMEOUT);
  }

  /**
   * If tracing is finished
   */
  get finished() {
    if (this.leaveOpen) return false;

    return [
      QueryTraceState.EOSE,
      QueryTraceState.TIMEOUT,
      QueryTraceState.DROP,
      QueryTraceState.REMOTE_CLOSE,
      QueryTraceState.LOCAL_CLOSE,
    ].includes(this.#currentState);
  }
}

export interface QueryEvents {
  trace: (event: QueryTraceEvent) => void;
  request: (subId: string, req: Array<ReqFilter>) => void;
  event: (evs: Array<TaggedNostrEvent>) => void;
  end: () => void;
  done: () => void;
}

/**
 * Active query - collects events and tracks traces
 */
export class Query extends EventEmitter<QueryEvents> {
  id: string;

  /**
   * RequestBuilder instance
   */
  requests: Array<ReqFilter> = [];

  /**
   * Which relays this query has already been executed on (read-only tracking)
   */
  #tracing: Map<string, QueryTrace> = new Map();

  /**
   * Leave the query open until its removed
   */
  #leaveOpen = false;

  /**
   * Skip cache layer
   */
  skipCache = false;

  /**
   * Use sync module for this query
   */
  useSyncModule = false;

  /**
   * Time when this query can be removed
   */
  #cancelAt?: number;

  /**
   * Timer used to track tracing status
   */
  #checkTrace?: ReturnType<typeof setInterval>;

  /**
   * Feed object which collects events
   */
  #feed: NoteCollection;

  /**
   * Maximum waiting time for this query
   */
  readonly timeout: number;

  /**
   * Milliseconds to wait before sending query (debounce)
   */
  #groupingDelay?: number;

  /**
   * Timer which waits for no-change before emitting filters
   */
  #groupTimeout?: ReturnType<typeof setTimeout>;

  /**
   * If the query should only every replace a previous trace on the same connection
   */
  #replaceable: boolean = false;

  /**
   * List of UUID request builder instance ids appended to this query
   */
  #builderInstances: Set<string>;

  /** Total number of duplicates produced by this query */
  #duplicates: number;

  #log = debug("Query");

  constructor(req: RequestBuilder) {
    super();
    this.id = req.id;
    this.#feed = new NoteCollection();
    this.#feed.on("event", evs => this.emit("event", evs));
    this.#builderInstances = new Set([]);
    this.#leaveOpen = req.options?.leaveOpen ?? false;
    this.skipCache = req.options?.skipCache ?? false;
    this.useSyncModule = req.options?.useSyncModule ?? false;
    this.timeout = req.options?.timeout ?? 5_000;
    this.#groupingDelay = req.options?.groupingDelay ?? 100;
    this.#replaceable = req.options?.replaceable ?? false;
    this.#duplicates = 0;

    this.addRequest(req);
  }

  /**
   * Adds another request to this one
   */
  addRequest(req: RequestBuilder) {
    if (this.#builderInstances.has(req.instance)) {
      return;
    }
    if (req.options?.extraEvents) {
      this.#feed.add(req.options.extraEvents);
    }
    if (req.numFilters > 0) {
      this.#log("Add query %O to %s", req, this.id);
      this.requests.push(...req.buildRaw());
      this.start();
      this.#builderInstances.add(req.instance);
      return true;
    }
    return false;
  }

  isOpen() {
    return this.#cancelAt === undefined && this.#leaveOpen;
  }

  canRemove() {
    return this.#cancelAt !== undefined && this.#cancelAt < unixNowMs();
  }

  /**
   * Recompute the complete set of compressed filters from all query traces
   */
  get filters() {
    return [...this.#tracing.values()].flatMap(a => a.filters);
  }

  get feed() {
    return this.#feed;
  }

  get snapshot() {
    return this.#feed.snapshot;
  }

  get traces() {
    return [...this.#tracing.values()];
  }

  get leaveOpen() {
    return this.#leaveOpen;
  }

  /**
   * Add a trace to this query
   */
  addTrace(trace: QueryTrace) {
    this.#tracing.set(trace.id, trace);
    trace.on("stateChange", event => {
      this.emit("trace", event);

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
        if (this.progress === 1) {
          this.emit("done");
        }
      }
    });
  }

  /**
   * Remove a trace from this query
   */
  removeTrace(traceId: string) {
    this.#tracing.delete(traceId);
  }

  /**
   * Add event to feed if it matches any trace filter
   */
  addEvent(sub: string, e: TaggedNostrEvent) {
    const trace = this.#tracing.get(sub);
    if (trace || sub === "*") {
      const filters = trace ? trace.filters : this.filters;
      if (filters.some(v => eventMatchesFilter(e, v))) {
        const added = this.feed.add(e);
        if (added === 0) {
          this.#duplicates++;
          const ratio = this.#duplicates / this.feed.snapshot.length;
          if (ratio > 2) {
            this.#log("High number of duplicates for: ", this.id, ratio, this.feed.snapshot.length);
          }
        }
      } else {
        this.#log("Event did not match filter, rejecting %O", e);
      }
    }
  }

  /**
   * This function should be called when this Query object and FeedStore is no longer needed
   */
  cancel() {
    this.#cancelAt = unixNowMs() + 1_000;
  }

  uncancel() {
    this.#cancelAt = undefined;
  }

  cleanup() {
    if (this.#groupTimeout) {
      clearTimeout(this.#groupTimeout);
      this.#groupTimeout = undefined;
    }
    this.emit("end");
  }

  closeQuery() {
    for (const qt of this.#tracing.values()) {
      if (!qt.finished) {
        qt.close();
      }
    }
    this.cleanup();
  }

  /**
   * Get the progress to EOSE, can be used to determine when we should load more content
   */
  get progress() {
    const traces = [...this.#tracing.values()];
    const thisProgress = traces.reduce((acc, v) => (acc += v.finished ? 1 : 0), 0) / traces.length;
    if (isNaN(thisProgress)) {
      return 0;
    }
    return thisProgress;
  }

  /**
   * Start filter emit
   */
  start() {
    if (this.#groupingDelay) {
      if (this.#groupTimeout !== undefined) return;
      this.#groupTimeout = setTimeout(() => {
        this.#emitFilters();
        this.#groupTimeout = undefined;
      }, this.#groupingDelay);
    } else {
      this.#emitFilters();
    }
  }

  async #emitFilters() {
    this.#log("Starting emit of %s", this.id);
    let rawFilters = [...this.requests];
    this.requests = [];
    if (this.#replaceable) {
      rawFilters.push(...this.filters);
    }
    if (rawFilters.length > 0) {
      this.emit("request", this.id, rawFilters);
    }
  }
}
