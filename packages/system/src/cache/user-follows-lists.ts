import { UsersFollows } from ".";
import { DexieTableLike, FeedCache } from "@snort/shared";

export class UserFollowsCache extends FeedCache<UsersFollows> {
  constructor(table?: DexieTableLike<UsersFollows>) {
    super("UserFollowsCache", table);
  }

  key(of: UsersFollows): string {
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

  takeSnapshot(): Array<UsersFollows> {
    return [...this.cache.values()];
  }

  async search() {
    return <Array<UsersFollows>>[];
  }
}
