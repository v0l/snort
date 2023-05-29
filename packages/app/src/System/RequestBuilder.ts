import { RawReqFilter, u256, HexKey, EventKind } from "@snort/nostr";
import { appendDedupe, dedupe } from "SnortUtils";
import { QueryBase } from "./Query";
import { diffFilters } from "./RequestSplitter";
import { RelayCache, splitAllByWriteRelays, splitByWriteRelays } from "./GossipModel";
import { mergeSimilar } from "./RequestMerger";

/**
 * Which strategy is used when building REQ filters
 */
export enum RequestStrategy {
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
  filters: Array<RawReqFilter>;
  relay: string;
  strategy: RequestStrategy;
}

export interface RequestBuilderOptions {
  leaveOpen?: boolean;
  relays?: Array<string>;
  /**
   * Do not apply diff logic and always use full filters for query
   */
  skipDiff?: boolean;
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

  buildRaw(): Array<RawReqFilter> {
    return this.#builders.map(f => f.filter);
  }

  build(relays: RelayCache): Array<BuiltRawReqFilter> {
    const expanded = this.#builders.map(a => a.build(relays)).flat();
    return this.#mergeSimilar(expanded);
  }

  /**
   * Detects a change in request from a previous set of filters
   * @param q All previous filters merged
   * @returns
   */
  buildDiff(relays: RelayCache, q: QueryBase): Array<BuiltRawReqFilter> {
    const next = this.buildRaw();
    const diff = diffFilters(q.filters, next);
    if (diff.changed) {
      console.debug("DIFF", q.filters, next, diff);
      return splitAllByWriteRelays(relays, diff.filters).map(a => {
        return {
          strategy: RequestStrategy.AuthorsRelays,
          filters: a.filters,
          relay: a.relay,
        };
      });
    }
    return [];
  }

  /**
   * Merge a set of expanded filters into the smallest number of subscriptions by merging similar requests
   * @param expanded
   * @returns
   */
  #mergeSimilar(expanded: Array<BuiltRawReqFilter>) {
    const relayMerged = expanded.reduce((acc, v) => {
      const existing = acc.get(v.relay);
      if (existing) {
        existing.push(v);
      } else {
        acc.set(v.relay, [v]);
      }
      return acc;
    }, new Map<string, Array<BuiltRawReqFilter>>());

    const filtersSquashed = [...relayMerged.values()].flatMap(a => {
      return mergeSimilar(a.flatMap(b => b.filters)).map(b => {
        return {
          filters: [b],
          relay: a[0].relay,
          strategy: a[0].strategy,
        } as BuiltRawReqFilter;
      });
    });

    return filtersSquashed;
  }
}

/**
 * Builder class for a single request filter
 */
export class RequestFilterBuilder {
  #filter: RawReqFilter = {};
  #relayHints = new Map<u256, Array<string>>();

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

  /**
   * Build/expand this filter into a set of relay specific queries
   */
  build(relays: RelayCache): Array<BuiltRawReqFilter> {
    // when querying for specific event ids with relay hints
    // take the first approach which is to split the filter by relay
    if (this.#filter.ids && this.#relayHints.size > 0) {
      const relays = dedupe([...this.#relayHints.values()].flat());
      return relays.map(r => {
        return {
          filters: [
            {
              ...this.#filter,
              ids: [...this.#relayHints.entries()].filter(([, v]) => v.includes(r)).map(([k]) => k),
            },
          ],
          relay: r,
          strategy: RequestStrategy.RelayHintedEventIds,
        };
      });
    }

    // If any authors are set use the gossip model to fetch data for each author
    if (this.#filter.authors) {
      const split = splitByWriteRelays(relays, this.#filter);
      return split.map(a => {
        return {
          filters: [a.filter],
          relay: a.relay,
          strategy: RequestStrategy.AuthorsRelays,
        };
      });
    }

    return [
      {
        filters: [this.filter],
        relay: "*",
        strategy: RequestStrategy.DefaultRelays,
      },
    ];
  }
}
