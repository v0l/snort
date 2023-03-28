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
  }
}
