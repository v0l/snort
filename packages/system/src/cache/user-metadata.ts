import { CachedMetadata } from ".";
import { FeedCache, CacheStore } from "@snort/shared";

export class UserProfileCache extends FeedCache<CachedMetadata> {
  constructor(store?: CacheStore<CachedMetadata>) {
    super("UserCache", store);
  }

  key(of: CachedMetadata): string {
    return of.pubkey;
  }

  override async preload(follows?: Array<string>): Promise<void> {
    await super.preload();
    // load follows profiles
    if (follows) {
      await this.buffer(follows);
    }
  }

  async search(q: string): Promise<Array<CachedMetadata>> {
    const lowerQ = q.toLowerCase();
    return [...this.cache.values()]
      .filter(user => {
        const profile = user as CachedMetadata;
        return (
          profile.name?.toLowerCase().includes(lowerQ) ||
          profile.display_name?.toLowerCase().includes(lowerQ) ||
          profile.nip05?.toLowerCase().includes(lowerQ)
        );
      })
      .slice(0, 5);
  }

  takeSnapshot(): CachedMetadata[] {
    return [...this.cache.values()];
  }
}
