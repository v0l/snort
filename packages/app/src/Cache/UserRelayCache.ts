import { db, UsersRelays } from "Db";
import FeedCache from "./FeedCache";

class UsersRelaysCache extends FeedCache<UsersRelays> {
  constructor() {
    super("UserRelays", db.userRelays);
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
    this.cache.forEach(v => (ret = v.created_at > ret ? v.created_at : ret));
    return ret;
  }

  takeSnapshot(): Array<UsersRelays> {
    return [...this.cache.values()];
  }
}

export const UserRelays = new UsersRelaysCache();
