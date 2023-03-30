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

export interface RequestBuilderOptions {
  leaveOpen?: boolean;
  relays?: Array<string>;
}

/**
 * Nostr REQ builder
 */
export class RequestBuilder {
  id: string;
  #builders: Array<RequestFilterBuilder>;
  #options?: RequestBuilderOptions;

  constructor(id: string) {
    this.id = id;
    this.#builders = [];
  }

  get numFilters() {
    return this.#builders.length;
  }

  get options() {
    return this.#options;
  }

  withFilter() {
    const ret = new RequestFilterBuilder();
    this.#builders.push(ret);
    return ret;
  }

  withOptions(opt: RequestBuilderOptions) {
    this.#options = {
      ...this.#options,
      ...opt,
    };
    return this;
  }

  build(): Array<RawReqFilter> {
    return this.#builders.map(a => a.filter);
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

  authors(authors?: Array<HexKey>) {
    if (!authors) return this;
    this.#filter.authors = appendDedupe(this.#filter.authors, authors);
    return this;
  }

  kinds(kinds?: Array<EventKind>) {
    if (!kinds) return this;
    this.#filter.kinds = appendDedupe(this.#filter.kinds, kinds);
    return this;
  }

  since(since?: number) {
    if (!since) return this;
    this.#filter.since = since;
    return this;
  }

  until(until?: number) {
    if (!until) return this;
    this.#filter.until = until;
    return this;
  }

  limit(limit?: number) {
    if (!limit) return this;
    this.#filter.limit = limit;
    return this;
  }

  tag(key: "e" | "p" | "d" | "t" | "r", value?: Array<string>) {
    if (!value) return this;
    this.#filter[`#${key}`] = value;
    return this;
  }

  search(keyword?: string) {
    if (!keyword) return this;
    this.#filter.search = keyword;
    return this;
  }
}
