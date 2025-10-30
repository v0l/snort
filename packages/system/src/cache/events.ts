import { NostrEvent } from "../nostr";
import { CacheStore, FeedCache } from "@snort/shared";

export class EventsCache extends FeedCache<NostrEvent> {
  constructor(store?: CacheStore<NostrEvent>) {
    super("EventsCache", store);
  }

  key(of: NostrEvent): string {
    return of.id;
  }

  override async preload(): Promise<void> {
    await super.preload();
    // load everything
    await this.buffer([...this.onTable]);
  }

  takeSnapshot(): Array<NostrEvent> {
    return [...this.cache.values()];
  }

  async search() {
    return <Array<NostrEvent>>[];
  }
}
