import { UsersRelays } from ".";
import { CacheStore, FeedCache } from "@snort/shared";

export class UserRelaysCache extends FeedCache<UsersRelays> {
  constructor(store?: CacheStore<UsersRelays>) {
    super("UserRelays", store);
  }

  key(of: UsersRelays): string {
    return of.pubkey;
  }

  override async preload(follows?: Array<string>): Promise<void> {
    await super.preload();
    if (follows) {
      await this.buffer(follows);
    }
  }

  newest(): number {
    let ret = 0;
    this.cache.forEach(v => (ret = v.created > ret ? v.created : ret));
    return ret;
  }

  takeSnapshot(): Array<UsersRelays> {
    return [...this.cache.values()];
  }

  async search() {
    return <Array<UsersRelays>>[];
  }
}
