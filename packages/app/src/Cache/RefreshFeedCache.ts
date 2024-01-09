import { FeedCache } from "@snort/shared";
import { EventPublisher, RequestBuilder, TaggedNostrEvent } from "@snort/system";

import { LoginSession } from "@/Utils/Login";

export type TWithCreated<T> = (T | Readonly<T>) & { created_at: number };

export abstract class RefreshFeedCache<T> extends FeedCache<TWithCreated<T>> {
  abstract buildSub(session: LoginSession, rb: RequestBuilder): void;
  abstract onEvent(evs: Readonly<Array<TaggedNostrEvent>>, pubKey: string, pub?: EventPublisher): void;

  /**
   * Get latest event
   */
  protected newest(filter?: (e: TWithCreated<T>) => boolean) {
    let ret = 0;
    this.cache.forEach(v => {
      if (!filter || filter(v)) {
        ret = v.created_at > ret ? v.created_at : ret;
      }
    });
    return ret;
  }

  override async preload(): Promise<void> {
    await super.preload();
    await this.buffer([...this.onTable]);
  }
}
