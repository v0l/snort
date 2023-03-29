import { Connection, RawReqFilter, Nips } from "@snort/nostr";
import { unixNowMs } from "Util";

export interface QueryRequest {
  filters: Array<RawReqFilter>;
  started: number;
  finished?: number;
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
  request: QueryRequest;

  /**
   * Sub-Queries which are connected to this subscription
   */
  subQueries: Array<Query> = [];

  /**
   * Which relays this query has already been executed on
   */
  #sentToRelays: Array<Readonly<Connection>> = [];

  /**
   * When each relay returned EOSE
   */
  #eoseRelays: Map<string, number> = new Map();

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

  constructor(id: string, request: QueryRequest) {
    this.id = id;
    this.request = request;
  }

  get closing() {
    return this.#cancelTimeout !== undefined;
  }

  get closingAt() {
    return this.#cancelTimeout;
  }

  cancel() {
    this.#cancelTimeout = unixNowMs() + 5_000;
  }

  unCancel() {
    this.#cancelTimeout = undefined;
  }

  sendToRelay(c: Connection) {
    if (this.relays.length > 0 && !this.relays.includes(c.Address)) {
      return;
    }
    if (this.relays.length === 0 && c.Ephemeral) {
      console.debug("Cant send non-specific REQ to ephemeral connection");
      return;
    }
    if (this.request.filters.some(a => a.search) && !c.SupportsNip(Nips.Search)) {
      console.debug("Cant send REQ to non-search relay", c.Address);
      return;
    }
    c.QueueReq(["REQ", this.id, ...this.request.filters]);
    this.#sentToRelays.push(c);
  }

  sendClose() {
    for (const c of this.#sentToRelays) {
      c.CloseReq(this.id);
    }
    for (const sq of this.subQueries) {
      sq.sendClose();
    }
  }

  eose(sub: string, relay: string) {
    if (sub === this.id) {
      console.debug(`[EOSE][${sub}] ${relay}`);
      this.#eoseRelays.set(relay, unixNowMs());
    } else {
      const subQ = this.subQueries.find(a => a.id === sub);
      if (subQ) {
        subQ.eose(sub, relay);
      } else {
        throw new Error("No query found");
      }
    }
  }

  /**
   * Get the progress to EOSE, can be used to determine when we should load more content
   */
  get progress() {
    let thisProgress = this.#eoseRelays.size / this.#sentToRelays.reduce((acc, v) => (acc += v.Down ? 0 : 1), 0);
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
}
