import debug from "debug";
import { v4 as uuid } from "uuid";
import { appendDedupe, dedupe, sanitizeRelayUrl, unixNowMs, unwrap } from "@snort/shared";

import EventKind from "./event-kind";
import { NostrLink, NostrPrefix, SystemInterface } from ".";
import { ReqFilter, u256, HexKey, TaggedNostrEvent } from "./nostr";
import { RequestRouter } from "./request-router";

/**
 * Which strategy is used when building REQ filters
 */
export const enum RequestStrategy {
  /**
   * Use the users default relays to fetch events,
   * this is the fallback option when there is no better way to query a given filter set
   */
  DefaultRelays = "default",

  /**
   * Using a cached copy of the authors relay lists NIP-65, split a given set of request filters by pubkey
   */
  AuthorsRelays = "authors-relays",

  /**
   * Use pre-determined relays for query
   */
  ExplicitRelays = "explicit-relays",
}

/**
 * A built REQ filter ready for sending to System
 */
export interface BuiltRawReqFilter {
  filters: Array<ReqFilter>;
  relay: string;
  strategy: RequestStrategy;

  // Use set sync from an existing set of events
  syncFrom?: Array<TaggedNostrEvent>;
}

export interface RequestBuilderOptions {
  /**
   * Dont send CLOSE directly after EOSE and allow events to stream in
   */
  leaveOpen?: boolean;

  /**
   * Do not apply diff logic and always use full filters for query
   */
  skipDiff?: boolean;

  /**
   * Pick N relays per pubkey when using outbox strategy
   */
  outboxPickN?: number;

  /**
   * Max wait time for this request
   */
  timeout?: number;

  /**
   * How many milli-seconds to wait to allow grouping
   */
  groupingDelay?: number;

  /**
   * If events should be added automatically to the internal NoteCollection
   * default=true
   */
  fillStore?: boolean;
}

/**
 * Nostr REQ builder
 */
export class RequestBuilder {
  id: string;
  instance: string;
  #builders: Array<RequestFilterBuilder>;
  #options?: RequestBuilderOptions;
  #log = debug("RequestBuilder");

  constructor(id: string) {
    this.instance = uuid();
    this.id = id;
    this.#builders = [];
  }

  get numFilters() {
    return this.#builders.length;
  }

  get filterBuilders() {
    return this.#builders;
  }

  get options() {
    return this.#options;
  }

  /**
   * Add another request builders filters to this one
   */
  add(other: RequestBuilder) {
    this.#builders.push(...other.#builders);
  }

  withFilter() {
    const ret = new RequestFilterBuilder();
    this.#builders.push(ret);
    return ret;
  }

  withBareFilter(f: ReqFilter) {
    const ret = new RequestFilterBuilder(f);
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

  buildRaw(): Array<ReqFilter> {
    return this.#builders.map(f => f.filter);
  }

  build(system: SystemInterface): Array<BuiltRawReqFilter> {
    const expanded = this.#builders.flatMap(a => a.build(system.requestRouter, this.#options));
    return this.#groupByRelay(system, expanded);
  }

  /**
   * Detects a change in request from a previous set of filters
   */
  async buildDiff(system: SystemInterface, prev: Array<ReqFilter>): Promise<Array<BuiltRawReqFilter>> {
    const start = unixNowMs();

    const diff = system.optimizer.getDiff(prev, this.buildRaw());
    const ts = unixNowMs() - start;
    this.#log("buildDiff %s %d ms +%d", this.id, ts, diff.length);
    if (diff.length > 0) {
      if (system.requestRouter) {
        // todo: fix for explicit relays
        return system.requestRouter.forFlatRequest(diff).map(a => {
          return {
            strategy: RequestStrategy.AuthorsRelays,
            filters: system.optimizer.flatMerge(a.filters),
            relay: a.relay,
          };
        });
      } else {
        return [
          {
            strategy: RequestStrategy.DefaultRelays,
            filters: system.optimizer.flatMerge(diff),
            relay: "",
          },
        ];
      }
    }
    return [];
  }

  /**
   * Merge a set of expanded filters into the smallest number of subscriptions by merging similar requests
   */
  #groupByRelay(system: SystemInterface, filters: Array<BuiltRawReqFilter>) {
    const relayMerged = filters.reduce((acc, v) => {
      const existing = acc.get(v.relay);
      if (existing) {
        existing.push(v);
      } else {
        acc.set(v.relay, [v]);
      }
      return acc;
    }, new Map<string, Array<BuiltRawReqFilter>>());

    const filtersSquashed = [...relayMerged.values()].map(a => {
      return {
        filters: system.optimizer.flatMerge(a.flatMap(b => b.filters.flatMap(c => system.optimizer.expandFilter(c)))),
        relay: a[0].relay,
        strategy: a[0].strategy,
      } as BuiltRawReqFilter;
    });

    return filtersSquashed;
  }
}

/**
 * Builder class for a single request filter
 */
export class RequestFilterBuilder {
  #filter: ReqFilter;
  #relays = new Set<string>();

  constructor(f?: ReqFilter) {
    this.#filter = f ?? {};
  }

  get filter() {
    return { ...this.#filter };
  }

  /**
   * Use a specific relay for this request filter
   */
  relay(u: string | Array<string>) {
    const relays = Array.isArray(u) ? u : [u];
    for (const r of relays) {
      const uClean = sanitizeRelayUrl(r);
      if (uClean) {
        this.#relays.add(uClean);
      }
    }
    return this;
  }

  ids(ids: Array<u256>) {
    this.#filter.ids = appendDedupe(this.#filter.ids, ids);
    return this;
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

  tag(key: "e" | "p" | "d" | "t" | "r" | "a" | "g" | string, value?: Array<string>) {
    if (!value) return this;
    this.#filter[`#${key}`] = appendDedupe(this.#filter[`#${key}`] as Array<string>, value);
    return this;
  }

  search(keyword?: string) {
    if (!keyword) return this;
    this.#filter.search = keyword;
    return this;
  }

  /**
   * Get event from link
   */
  link(link: NostrLink) {
    if (link.type === NostrPrefix.Address) {
      this.tag("d", [link.id])
        .kinds([unwrap(link.kind)])
        .authors([unwrap(link.author)]);
    } else {
      this.ids([link.id]);
    }
    link.relays?.forEach(v => this.relay(v));
    return this;
  }

  /**
   * Get replies to link with e/a tags
   */
  replyToLink(links: Array<NostrLink>) {
    const types = dedupe(links.map(a => a.type));
    if (types.length > 1) throw new Error("Cannot add multiple links of different kinds");

    const tags = links.map(a => unwrap(a.toEventTag()));
    this.tag(
      tags[0][0],
      tags.map(v => v[1]),
    );
    return this;
  }

  /**
   * Build/expand this filter into a set of relay specific queries
   */
  build(model?: RequestRouter, options?: RequestBuilderOptions): Array<BuiltRawReqFilter> {
    return this.#buildFromFilter(this.#filter, model, options);
  }

  #buildFromFilter(f: ReqFilter, model?: RequestRouter, options?: RequestBuilderOptions) {
    // use the explicit relay list first
    if (this.#relays.size > 0) {
      return [...this.#relays].map(r => {
        return {
          filters: [f],
          relay: r,
          strategy: RequestStrategy.ExplicitRelays,
        };
      });
    }

    // If any authors are set use the gossip model to fetch data for each author
    if (f.authors && model) {
      const split = model.forRequest(f, options?.outboxPickN);
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
        filters: [f],
        relay: "",
        strategy: RequestStrategy.DefaultRelays,
      },
    ];
  }
}
