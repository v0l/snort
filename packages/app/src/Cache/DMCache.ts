import { NostrEvent } from "@snort/system";
import { FeedCache } from "@snort/shared";
import { db } from "Db";

class DMCache extends FeedCache<NostrEvent> {
  constructor() {
    super("DMCache", db.dms);
  }

  key(of: NostrEvent): string {
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

  allDms(): Array<NostrEvent> {
    return [...this.cache.values()];
  }

  takeSnapshot(): Array<NostrEvent> {
    return this.allDms();
  }
}

export const DmCache = new DMCache();
