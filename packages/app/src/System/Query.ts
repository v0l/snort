import { v4 as uuid } from "uuid";
import { Connection, RawReqFilter, Nips } from "@snort/nostr";
import { unixNowMs } from "Util";
import { NoteStore } from "./NoteCollection";
/**
 * Tracing for relay query status
 */
class QueryTrace {
  readonly id: string;
  readonly subId: string;
  readonly relay: string;
  readonly connId: string;
  readonly start: number;
  sent?: number;
  eose?: number;
  close?: number;
  #wasForceClosed = false;
  readonly #fnClose: (id: string) => void;

  constructor(sub: string, relay: string, connId: string, fnClose: (id: string) => void) {
    this.id = uuid();
    this.subId = sub;
    this.relay = relay;
    this.connId = connId;
    this.start = unixNowMs();
    this.#fnClose = fnClose;
  }

  sentToRelay() {
    this.sent = unixNowMs();
  }

  gotEose() {
    this.eose = unixNowMs();
  }

  forceEose() {
    this.eose = unixNowMs();
    this.#wasForceClosed = true;
  }

  sendClose() {
    this.close = unixNowMs();
    this.#fnClose(this.subId);
  }

  log() {
    console.debug(
      `QT:${this.id}, ${this.relay}, ${this.subId}, finished=${
        this.finished
      }, queued=${this.queued.toLocaleString()}ms, runtime=${this.runtime?.toLocaleString()}ms`
    );
  }

  /**
   * Time spent in queue
   */
  get queued() {
    return (this.sent === undefined ? unixNowMs() : this.sent) - this.start;
  }

  /**
   * Total query runtime
   */
  get runtime() {
    return (this.eose === undefined ? unixNowMs() : this.eose) - this.start;
  }

  /**
   * If tracing is finished, we got EOSE or timeout
   */
  get finished() {
    return this.eose !== undefined;
  }
}

/**
 * Active or queued query on the system
 */
export class Query {
  /**
   * Uniquie ID of this query
   */
  id: string;

  /**
   * The query payload (REQ filters)
   */
  filters: Array<RawReqFilter>;

  /**
   * Sub-Queries which are connected to this subscription
   */
  subQueries: Array<Query> = [];

  /**
   * Which relays this query has already been executed on
   */
  #tracing: Array<QueryTrace> = [];

  /**
   * Leave the query open until its removed
   */
  leaveOpen = false;

  /**
   * List of relays to send this query to
   */
  relays: Array<string> = [];

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
  #feed?: NoteStore;

  constructor(id: string, filters: Array<RawReqFilter>, feed?: NoteStore) {
    this.id = id;
    this.filters = filters;
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

  cancel() {
    this.#cancelTimeout = unixNowMs() + 5_000;
  }

  unCancel() {
    this.#cancelTimeout = undefined;
  }

  cleanup() {
    console.debug("Cleanup", this.id);
    this.#stopCheckTraces();
  }

  sendToRelay(c: Connection) {
    if (this.relays.length > 0 && !this.relays.includes(c.Address)) {
      return;
    }
    if (this.relays.length === 0 && c.Ephemeral) {
      console.debug("Cant send non-specific REQ to ephemeral connection");
      return;
    }
    if (this.filters.some(a => a.search) && !c.SupportsNip(Nips.Search)) {
      console.debug("Cant send REQ to non-search relay", c.Address);
      return;
    }
    const qt = new QueryTrace(this.id, c.Address, c.Id, x => c.CloseReq(x));
    this.#tracing.push(qt);
    c.QueueReq(["REQ", this.id, ...this.filters], () => qt.sentToRelay());
  }

  connectionLost(c: Connection, active: Array<string>, pending: Array<string>) {
    const allQueriesLost = [...active, ...pending].filter(a => this.id === a || this.subQueries.some(b => b.id === a));
    if (allQueriesLost.length > 0) {
      console.debug("Lost", allQueriesLost, c.Address, c.Id);
    }
  }

  sendClose() {
    for (const qt of this.#tracing) {
      qt.sendClose();
    }
    for (const sq of this.subQueries) {
      sq.sendClose();
    }
    this.cleanup();
  }

  eose(sub: string, conn: Readonly<Connection>) {
    const qt = this.#tracing.filter(a => a.subId === sub && a.connId === conn.Id);
    if (sub === this.id) {
      console.debug(`[EOSE][${sub}] ${conn.Address}`);
      qt.forEach(a => a.gotEose());
      if (this.#feed) {
        this.#feed.loading = this.progress < 1;
      }
      if (!this.leaveOpen) {
        this.sendClose();
      }
    } else {
      const subQ = this.subQueries.find(a => a.id === sub);
      if (subQ) {
        subQ.eose(sub, conn);
      } else {
        throw new Error("No query found");
      }
    }
  }

  /**
   * Get the progress to EOSE, can be used to determine when we should load more content
   */
  get progress() {
    let thisProgress = this.#tracing.reduce((acc, v) => (acc += v.finished ? 1 : 0), 0) / this.#tracing.length;
    if (isNaN(thisProgress)) {
      thisProgress = 0;
    }
    if (this.subQueries.length === 0) {
      return thisProgress;
    }

    let totalProgress = thisProgress;
    for (const sq of this.subQueries) {
      totalProgress += sq.progress;
    }
    return totalProgress / (this.subQueries.length + 1);
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
        //v.log();
        if (v.runtime > 5_000 && !v.finished) {
          v.forceEose();
        }
      }
    }, 2_000);
  }
}
