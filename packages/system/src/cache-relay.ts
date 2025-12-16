import type { OkResponse, ReqCommand, TaggedNostrEvent } from "./nostr";

/**
 * A cache relay is an always available local (local network / browser worker) relay
 * Which should contain all of the content we're looking for and respond quickly.
 */
export interface CacheRelay {
  /**
   * Write event to cache relay
   */
  event(ev: TaggedNostrEvent): Promise<OkResponse>;

  /**
   * Read event from cache relay
   */
  query(req: ReqCommand): Promise<Array<TaggedNostrEvent>>;

  /**
   * Delete events by filter
   */
  delete(req: ReqCommand): Promise<Array<string>>;
}
