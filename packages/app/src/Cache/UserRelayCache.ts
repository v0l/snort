import { db, UsersRelays } from "Db";
import FeedCache from "./FeedCache";

class UsersRelaysCache extends FeedCache<UsersRelays> {
  constructor() {
    super("UserRelays", db.userRelays);
  }

  key(of: UsersRelays): string {
    return of.pubkey;
  }

  takeSnapshot(): Array<UsersRelays> {
    return [...this.cache.values()];
  }
}

export const UserRelays = new UsersRelaysCache();
