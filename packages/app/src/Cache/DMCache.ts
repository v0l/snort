import { RawEvent } from "@snort/nostr";
import { db } from "Db";
import FeedCache from "./FeedCache";

class DMCache extends FeedCache<RawEvent> {
  constructor() {
    super("DMCache", db.dms);
  }

  key(of: RawEvent): string {
    return of.id;
  }

  override async preload(): Promise<void> {
    await super.preload();
    // load all dms to memory
    await this.buffer([...this.onTable]);
  }

  newest(): number {
    let ret = 0;
    this.cache.forEach(v => (ret = v.created_at > ret ? v.created_at : ret));
    return ret;
  }

  allDms(): Array<RawEvent> {
    return [...this.cache.values()];
  }

  takeSnapshot(): Array<RawEvent> {
    return this.allDms();
  }
}

export const DmCache = new DMCache();
