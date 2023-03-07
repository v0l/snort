import { RawReqFilter, u256, HexKey, EventKind } from "@snort/nostr";
import { appendDedupe } from "Util";

/**
 * Which strategy is used when building REQ filters
 */
export enum NostrRequestStrategy {
  /**
   * Use the users default relays to fetch events,
   * this is the fallback option when there is no better way to query a given filter set
   */
  DefaultRelays = 1,

  /**
   * Using a cached copy of the authors relay lists NIP-65, split a given set of request filters by pubkey
   */
  AuthorsRelays = 2,

  /**
   * Relay hints are usually provided when using replies
   */
  RelayHintedEventIds = 3,
}

/**
 * A built REQ filter ready for sending to System
 */
export interface BuiltRawReqFilter {
  id: string;
  filter: Array<RawReqFilter>;
  relays: Array<string>;
  strategy: NostrRequestStrategy;
}

/**
 * Nostr REQ builder
 */
export class RequestBuilder {
  id: string;
  #builders: Array<RequestFilterBuilder>;

  constructor(id: string) {
    this.id = id;
    this.#builders = [];
  }

  withFilter() {
    const ret = new RequestFilterBuilder();
    this.#builders.push(ret);
    return ret;
  }

  build() {
    return ["REQ", this.id, ...this.#builders.map(a => a.filter)];
  }
}

/**
 * Builder class for a single request filter
 */
export class RequestFilterBuilder {
  #filter: RawReqFilter = {};
  #relayHints: Map<u256, Array<string>> = new Map();

  get filter() {
    return { ...this.#filter };
  }

  get relayHints() {
    return new Map(this.#relayHints);
  }

  ids(ids: Array<u256>) {
    this.#filter.ids = appendDedupe(this.#filter.ids, ids);
    return this;
  }

  id(id: u256, relay?: string) {
    if (relay) {
      this.#relayHints.set(id, appendDedupe(this.#relayHints.get(id), [relay]));
    }
    return this.ids([id]);
  }

  authors(authors: Array<HexKey>) {
    this.#filter.authors = appendDedupe(this.#filter.authors, authors);
    return this;
  }

  kinds(kinds: Array<EventKind>) {
    this.#filter.kinds = appendDedupe(this.#filter.kinds, kinds);
    return this;
  }

  since(since: number) {
    this.#filter.since = since;
    return this;
  }

  until(until: number) {
    this.#filter.until = until;
    return this;
  }

  limit(limit: number) {
    this.#filter.limit = limit;
    return this;
  }

  tag(key: "e" | "p" | "d" | "t", value: Array<string>) {
    this.#filter[`#${key}`] = value;
    return this;
  }

  search(keyword: string) {
    this.#filter.search = keyword;
    return this;
  }
}
