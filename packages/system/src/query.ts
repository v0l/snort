import { v4 as uuid } from "uuid";
import debug from "debug";
import { EventEmitter } from "eventemitter3";
import { unixNowMs, unwrap } from "@snort/shared";

import { ReqFilter, Nips, TaggedNostrEvent, SystemInterface, ParsedFragment } from ".";
import { NoteCollection } from "./note-collection";
import { BuiltRawReqFilter, RequestBuilder } from "./request-builder";
import { eventMatchesFilter } from "./request-matcher";
import { LRUCache } from "lru-cache";
import { ConnectionType } from "./connection-pool";

interface QueryTraceEvents {
  close: (id: string) => void;
  eose: (id: string, connId: string, wasForced: boolean) => void;
}

/**
 * Tracing for relay query status
 */
export class QueryTrace extends EventEmitter<QueryTraceEvents> {
  readonly id: string;
  readonly start: number;
  sent?: number;
  eose?: number;
  close?: number;
  #wasForceClosed = false;

  constructor(
    readonly relay: string,
    readonly filters: Array<ReqFilter>,
    readonly connId: string,
  ) {
    super();
    this.id = uuid();
    this.start = unixNowMs();
  }

  sentToRelay() {
    this.sent = unixNowMs();
  }

  gotEose() {
    this.eose = unixNowMs();
    this.emit("eose", this.id, this.connId, false);
  }

  forceEose() {
    this.sent ??= unixNowMs();
    this.eose = unixNowMs();
    this.#wasForceClosed = true;
    this.sendClose();
    this.emit("eose", this.id, this.connId, true);
  }

  sendClose() {
    this.close = unixNowMs();
    this.emit("close", this.id);
  }

  /**
   * Time spent in queue
   */
  get queued() {
    return (this.sent === undefined ? unixNowMs() : this.#wasForceClosed ? unwrap(this.eose) : this.sent) - this.start;
  }

  /**
   * Total query runtime
   */
  get runtime() {
    return (this.eose === undefined ? unixNowMs() : this.eose) - this.start;
  }

  /**
   * Total time spent waiting for relay to respond
   */
  get responseTime() {
    return this.finished ? unwrap(this.eose) - (this.sent ?? unixNowMs()) : 0;
  }

  /**
   * If tracing is finished, we got EOSE or timeout
   */
  get finished() {
    return this.eose !== undefined;
  }
}

export interface TraceReport {
  id: string;
  conn: ConnectionType;
  wasForced: boolean;
  queued: number;
  responseTime: number;
}

export interface QueryEvents {
  trace: (report: TraceReport) => void;
  request: (subId: string, req: BuiltRawReqFilter) => void;
  event: (evs: Array<TaggedNostrEvent>) => void;
  end: () => void;
  done: () => void;
}

const QueryCache = new LRUCache<string, Array<TaggedNostrEvent>>({
  ttl: 60_000 * 3,
  ttlAutopurge: true,
});

/**
 * Active or queued query on the system
 */
export class Query extends EventEmitter<QueryEvents> {
  get id() {
    return this.request.id;
  }

  /**
   * RequestBuilder instance
   */
  request: RequestBuilder;

  /**
   * Nostr system interface
   */
  #system: SystemInterface;

  /**
   * Which relays this query has already been executed on
   */
  #tracing: Array<QueryTrace> = [];

  /**
   * Leave the query open until its removed
   */
  #leaveOpen = false;

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
  #timeout: number;

  /**
   * Milliseconds to wait before sending query (debounce)
   */
  #groupingDelay?: number;

  /**
   * Timer which waits for no-change before emitting filters
   */
  #groupTimeout?: ReturnType<typeof setTimeout>;

  #log = debug("Query");

  constructor(system: SystemInterface, req: RequestBuilder) {
    super();
    this.request = req;
    this.#system = system;
    this.#feed = new NoteCollection();
    this.#leaveOpen = req.options?.leaveOpen ?? false;
    this.#timeout = req.options?.timeout ?? 5_000;
    this.#groupingDelay = req.options?.groupingDelay ?? 100;
    this.#checkTraces();

    const cached = QueryCache.get(this.request.id);
    if (cached) {
      this.#log("Restored %o for %s", cached, this.request.id);
      this.feed.add(cached);
    }
    this.feed.on("event", evs => this.emit("event", evs));
    this.#start();
  }

  /**
   * Adds another request to this one
   */
  addRequest(req: RequestBuilder) {
    if (req.instance === this.request.instance) {
      // same requst, do nothing
      this.#log("Same query %O === %O", req, this.request);
      return;
    }
    this.#log("Add query %O to %s", req, this.id);
    this.request.add(req);
    this.#start();
    return true;
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
    return this.#tracing.flatMap(a => a.filters);
  }

  get feed() {
    return this.#feed;
  }

  get snapshot() {
    return this.#feed.snapshot;
  }

  handleEvent(sub: string, e: TaggedNostrEvent) {
    for (const t of this.#tracing) {
      if (t.id === sub || sub === "*") {
        if (t.filters.some(v => eventMatchesFilter(e, v))) {
          this.feed.add(e);
        } else {
          this.#log("Event did not match filter, rejecting %O %O", e, t);
        }
        break;
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
    this.#stopCheckTraces();
    this.emit("end");
    QueryCache.set(this.request.id, this.feed.snapshot);
    this.#log("Saved %O for %s", this.feed.snapshot, this.request.id);
  }

  /**
   * Insert a new trace as a placeholder
   */
  insertCompletedTrace(subq: BuiltRawReqFilter, data: Array<TaggedNostrEvent>) {
    const qt = new QueryTrace(subq.relay, subq.filters, "");
    qt.sentToRelay();
    qt.gotEose();
    this.#tracing.push(qt);
    this.feed.add(data);
    return qt;
  }

  sendToRelay(c: ConnectionType, subq: BuiltRawReqFilter) {
    if (!this.#canSendQuery(c, subq)) {
      return;
    }
    return this.#sendQueryInternal(c, subq);
  }

  connectionLost(id: string) {
    this.#tracing.filter(a => a.connId == id).forEach(a => a.forceEose());
  }

  connectionRestored(c: ConnectionType) {
    if (this.isOpen()) {
      for (const qt of this.#tracing) {
        if (qt.relay === c.address) {
          // todo: queue sync?
          c.request(["REQ", qt.id, ...qt.filters], () => qt.sentToRelay());
        }
      }
    }
  }

  sendClose() {
    for (const qt of this.#tracing) {
      qt.sendClose();
    }
    this.cleanup();
  }

  /**
   * Get the progress to EOSE, can be used to determine when we should load more content
   */
  get progress() {
    const thisProgress = this.#tracing.reduce((acc, v) => (acc += v.finished ? 1 : 0), 0) / this.#tracing.length;
    if (isNaN(thisProgress)) {
      return 0;
    }
    return thisProgress;
  }

  #start() {
    if (this.#groupTimeout) {
      clearTimeout(this.#groupTimeout);
      this.#groupTimeout = undefined;
    }
    if (this.#groupingDelay) {
      this.#groupTimeout = setTimeout(() => {
        this.#emitFilters();
      }, this.#groupingDelay);
    } else {
      this.#emitFilters();
    }
  }

  handleEose(sub: string, conn: Readonly<ConnectionType>) {
    const qt = this.#tracing.find(a => a.id === sub && a.connId === conn.id);
    if (qt) {
      qt.gotEose();
      if (!this.#leaveOpen) {
        qt.sendClose();
      }
    }
  }

  async #emitFilters() {
    this.#log("Starting emit of %s", this.id);
    const existing = this.filters;
    if (!(this.request.options?.skipDiff ?? false) && existing.length > 0) {
      const filters = this.request.buildDiff(this.#system, existing);
      this.#log("Build %s %O", this.id, filters);
      filters.forEach(f => this.emit("request", this.id, f));
    } else {
      const filters = this.request.build(this.#system);
      this.#log("Build %s %O", this.id, filters);
      filters.forEach(f => this.emit("request", this.id, f));
    }
  }

  #stopCheckTraces() {
    if (this.#checkTrace) {
      clearInterval(this.#checkTrace);
      this.#checkTrace = undefined;
    }
  }

  #checkTraces() {
    this.#stopCheckTraces();
    this.#checkTrace = setInterval(() => {
      for (const v of this.#tracing) {
        if (v.runtime > this.#timeout && !v.finished) {
          v.forceEose();
        }
      }
    }, 500);
  }

  #canSendQuery(c: ConnectionType, q: BuiltRawReqFilter) {
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
    if (this.canRemove()) {
      this.#log("Cant send REQ when query is closed", this.id, q);
      return false;
    }
    return true;
  }

  #sendQueryInternal(c: ConnectionType, q: BuiltRawReqFilter) {
    let filters = q.filters;
    const qt = new QueryTrace(c.address, filters, c.id);
    qt.on("close", x => c.closeRequest(x));
    qt.on("eose", (id, connId, forced) => {
      this.emit("trace", {
        id,
        conn: c,
        wasForced: forced,
        queued: qt.queued,
        responseTime: qt.responseTime,
      } as TraceReport);
      if (this.progress === 1) {
        this.emit("done");
      }
    });
    const eventHandler = (sub: string, ev: TaggedNostrEvent) => {
      if ((this.request.options?.fillStore ?? true) && qt.id === sub) {
        if (qt.filters.some(v => eventMatchesFilter(ev, v))) {
          this.feed.add(ev);
        } else {
          this.#log("Event did not match filter, rejecting %O %O", ev, qt);
        }
      }
    };
    const eoseHandler = (sub: string) => {
      this.handleEose(sub, c);
    };
    c.on("event", eventHandler);
    c.on("eose", eoseHandler);
    c.on("closed", eoseHandler);
    this.on("end", () => {
      c.off("event", eventHandler);
      c.off("eose", eoseHandler);
      c.off("closed", eoseHandler);
    });
    this.#tracing.push(qt);

    if (q.syncFrom !== undefined) {
      c.request(["SYNC", qt.id, q.syncFrom, ...qt.filters], () => qt.sentToRelay());
    } else {
      c.request(["REQ", qt.id, ...qt.filters], () => qt.sentToRelay());
    }
    return qt;
  }
}
