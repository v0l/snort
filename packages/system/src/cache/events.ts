import { NostrEvent } from "nostr";
import { db } from ".";
import { FeedCache } from "@snort/shared";

export class EventsCache extends FeedCache<NostrEvent> {
  constructor() {
    super("EventsCache", db.events);
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
}
