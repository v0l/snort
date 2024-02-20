import { NostrEvent, ReqFilter } from "./nostr";
import { FlatReqFilter } from "./query-optimizer";

export interface RelayTaggedFilter {
  relay: string;
  filter: ReqFilter;
}

export interface RelayTaggedFlatFilters {
  relay: string;
  filters: Array<FlatReqFilter>;
}

export interface RelayTaggedFilters {
  relay: string;
  filters: Array<ReqFilter>;
}

/**
 * Request router managed splitting of requests to one or more relays, and which relay to send events to.
 */
export interface RequestRouter {
  /**
   * Pick relays to send an event to
   * @param ev The reply event to send
   * @param system Nostr system interface
   * @param pickN Number of relays to pick per recipient
   * @returns
   */
  forReply(ev: NostrEvent, pickN?: number): Promise<Array<string>>;

  /**
   * Split a request filter to one or more relays.
   * @param filter Filter to split
   * @param pickN Number of relays to pick
   * @returns
   */
  forRequest(filter: ReqFilter, pickN?: number): Array<RelayTaggedFilter>;

  /**
   * Split a request filter to one or more relays.
   * @param filter Filters to split
   * @param pickN Number of relays to pick
   * @returns
   */
  forFlatRequest(filter: Array<FlatReqFilter>, pickN?: number): Array<RelayTaggedFlatFilters>;
}

export abstract class BaseRequestRouter implements RequestRouter {
  abstract forReply(ev: NostrEvent, pickN?: number): Promise<Array<string>>;
  abstract forRequest(filter: ReqFilter, pickN?: number): Array<RelayTaggedFilter>;
  abstract forFlatRequest(filter: FlatReqFilter[], pickN?: number): Array<RelayTaggedFlatFilters>;

  forAllRequest(filters: Array<ReqFilter>) {
    const allSplit = filters
      .map(a => this.forRequest(a))
      .reduce((acc, v) => {
        for (const vn of v) {
          const existing = acc.get(vn.relay);
          if (existing) {
            existing.push(vn.filter);
          } else {
            acc.set(vn.relay, [vn.filter]);
          }
        }
        return acc;
      }, new Map<string, Array<ReqFilter>>());

    return [...allSplit.entries()].map(([k, v]) => {
      return {
        relay: k,
        filters: v,
      } as RelayTaggedFilters;
    });
  }
}
