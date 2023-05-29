import { v4 as uuid } from "uuid";
import debug from "debug";
import { Connection, RawReqFilter, Nips } from "@snort/nostr";
import { unixNowMs, unwrap } from "SnortUtils";
import { NoteStore } from "./NoteCollection";
import { mergeSimilar } from "./RequestMerger";

/**
 * Tracing for relay query status
 */
class QueryTrace {
  readonly id: string;
  readonly start: number;
  sent?: number;
  eose?: number;
  close?: number;
  #wasForceClosed = false;
  readonly #fnClose: (id: string) => void;
  readonly #fnProgress: () => void;

  constructor(
    readonly subId: string,
    readonly relay: string,
    readonly filters: Array<RawReqFilter>,
    readonly connId: string,
    fnClose: (id: string) => void,
    fnProgress: () => void
  ) {
    this.id = uuid();
    this.start = unixNowMs();
    this.#fnClose = fnClose;
    this.#fnProgress = fnProgress;
  }

  sentToRelay() {
    this.sent = unixNowMs();
    this.#fnProgress();
  }

  gotEose() {
    this.eose = unixNowMs();
    this.#fnProgress();
  }

  forceEose() {
    this.eose = unixNowMs();
    this.#wasForceClosed = true;
    this.#fnProgress();
    this.sendClose();
  }

  sendClose() {
    this.close = unixNowMs();
    this.#fnClose(this.subId);
    this.#fnProgress();
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
    return this.finished ? unwrap(this.eose) - unwrap(this.sent) : 0;
  }

  /**
   * If tracing is finished, we got EOSE or timeout
   */
  get finished() {
    return this.eose !== undefined;
  }
}

export interface QueryBase {
  /**
   * Uniquie ID of this query
   */
  id: string;

  /**
   * The query payload (REQ filters)
   */
  filters: Array<RawReqFilter>;

  /**
   * List of relays to send this query to
   */
  relays?: Array<string>;
}

/**
 * Active or queued query on the system
 */
export class Query implements QueryBase {
  /**
   * Uniquie ID of this query
   */
  id: string;

  /**
   * Which relays this query has already been executed on
   */
  #tracing: Array<QueryTrace> = [];

  /**
   * Leave the query open until its removed
   */
  leaveOpen = false;

  /**
   * Time when this query can be removed
   */
  #cancelTimeout?: number;

  /**
   * Timer used to track tracing status
   */
  #checkTrace?: ReturnType<typeof setInterval>;

  /**
   * Feed object which collects events
   */
  #feed: NoteStore;

  subQueryCounter = 0;
  #log = debug("Query");

  constructor(id: string, feed: NoteStore) {
    this.id = id;
    this.#feed = feed;
    this.#checkTraces();
  }

  get closing() {
    return this.#cancelTimeout !== undefined;
  }

  get closingAt() {
    return this.#cancelTimeout;
  }

  get feed() {
    return this.#feed;
  }

  get filters() {
    const filters = this.#tracing.flatMap(a => a.filters);
    return mergeSimilar(filters);
  }

  cancel() {
    this.#cancelTimeout = unixNowMs() + 5_000;
  }

  unCancel() {
    this.#cancelTimeout = undefined;
  }

  cleanup() {
    this.#stopCheckTraces();
  }

  sendToRelay(c: Connection, subq?: QueryBase) {
    if (!this.#canSendQuery(c, subq ?? this)) {
      return;
    }
    this.#sendQueryInternal(c, subq ?? this);
  }

  connectionLost(id: string) {
    this.#tracing.filter(a => a.connId == id).forEach(a => a.forceEose());
  }

  sendClose() {
    for (const qt of this.#tracing) {
      qt.sendClose();
    }
    this.cleanup();
  }

  eose(sub: string, conn: Readonly<Connection>) {
    const qt = this.#tracing.find(a => a.subId === sub && a.connId === conn.Id);
    qt?.gotEose();
    if (!this.leaveOpen) {
      qt?.sendClose();
    }
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

  #onProgress() {
    const isFinished = this.progress === 1;
    if (this.feed.loading !== isFinished) {
      this.#log("%s loading=%s, progress=%d", this.id, this.feed.loading, this.progress);
      this.feed.loading = isFinished;
    }
  }

  #stopCheckTraces() {
    if (this.#checkTrace) {
      clearInterval(this.#checkTrace);
    }
  }

  #checkTraces() {
    this.#stopCheckTraces();
    this.#checkTrace = setInterval(() => {
      for (const v of this.#tracing) {
        if (v.runtime > 5_000 && !v.finished) {
          v.forceEose();
        }
      }
    }, 500);
  }

  #canSendQuery(c: Connection, q: QueryBase) {
    if (q.relays && !q.relays.includes(c.Address)) {
      return false;
    }
    if ((q.relays?.length ?? 0) === 0 && c.Ephemeral) {
      this.#log("Cant send non-specific REQ to ephemeral connection %O %O %O", q, q.relays, c);
      return false;
    }
    if (q.filters.some(a => a.search) && !c.SupportsNip(Nips.Search)) {
      this.#log("Cant send REQ to non-search relay", c.Address);
      return false;
    }
    return true;
  }

  #sendQueryInternal(c: Connection, q: QueryBase) {
    const qt = new QueryTrace(
      q.id,
      c.Address,
      q.filters,
      c.Id,
      x => c.CloseReq(x),
      () => this.#onProgress()
    );
    this.#tracing.push(qt);
    c.QueueReq(["REQ", q.id, ...q.filters], () => qt.sentToRelay());
  }
}
