import { FeedCache } from "@snort/shared";
import { RequestBuilder, TaggedNostrEvent } from "@snort/system";
import { LoginSession } from "Login";

export type TWithCreated<T> = T & { created_at: number };

export abstract class RefreshFeedCache<T> extends FeedCache<TWithCreated<T>> {
  abstract buildSub(session: LoginSession, rb: RequestBuilder): void;
  abstract onEvent(evs: Readonly<Array<TaggedNostrEvent>>): void;

  /**
   * Get latest event
   */
  protected newest() {
    let ret = 0;
    this.cache.forEach(v => (ret = v.created_at > ret ? v.created_at : ret));
    return ret;
  }

  override async preload(): Promise<void> {
    await super.preload();
    // load all dms to memory
    await this.buffer([...this.onTable]);
  }
}
