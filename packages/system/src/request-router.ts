import { unwrap } from "@snort/shared";
import { NostrEvent, ReqFilter } from "./nostr";
import { FlatReqFilter } from "./query-optimizer";

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
  forRequest(filter: ReqFilter, pickN?: number): Array<ReqFilter>;

  /**
   * Split a request filter to one or more relays.
   * @param filter Filters to split
   * @param pickN Number of relays to pick
   * @returns
   */
  forFlatRequest(filter: Array<FlatReqFilter>, pickN?: number): Array<FlatReqFilter>;

  /**
   * Same as forRequest, but merges the results
   * @param filters
   */
  forAllRequest(filters: Array<ReqFilter>): Array<ReqFilter>;
}

export abstract class BaseRequestRouter implements RequestRouter {
  abstract forReply(ev: NostrEvent, pickN?: number): Promise<Array<string>>;
  abstract forRequest(filter: ReqFilter, pickN?: number): Array<ReqFilter>;
  abstract forFlatRequest(filter: FlatReqFilter[], pickN?: number): Array<FlatReqFilter>;

  forAllRequest(filters: Array<ReqFilter>) {
    const allSplit = filters
      .map(a => this.forRequest(a))
      .reduce((acc, v) => {
        for (const vn of v) {
          for (const r of (vn.relays?.length ?? 0) > 0 ? unwrap(vn.relays) : [""]) {
            const existing = acc.get(r);
            if (existing) {
              existing.push(vn);
            } else {
              acc.set(r, [vn]);
            }
          }
        }
        return acc;
      }, new Map<string, Array<ReqFilter>>());

    return [...allSplit.values()].flat();
  }
}
