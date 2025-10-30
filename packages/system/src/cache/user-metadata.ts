import { CachedMetadata } from ".";
import { fetchNip05Pubkey, FeedCache, LNURL, CacheStore } from "@snort/shared";

export class UserProfileCache extends FeedCache<CachedMetadata> {
  #zapperQueue: Array<{ pubkey: string; lnurl: string }> = [];
  #nip5Queue: Array<{ pubkey: string; nip05: string }> = [];

  constructor(store?: CacheStore<CachedMetadata>) {
    super("UserCache", store);
    //this.#processZapperQueue();
    //this.#processNip5Queue();
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
          profile.npub?.toLowerCase().includes(lowerQ) ||
          profile.display_name?.toLowerCase().includes(lowerQ) ||
          profile.nip05?.toLowerCase().includes(lowerQ)
        );
      })
      .slice(0, 5);
  }

  /**
   * Try to update the profile metadata cache with a new version
   * @param m Profile metadata
   * @returns
   */
  override async update(m: CachedMetadata) {
    const updateType = await super.update(m);
    if (updateType !== "refresh") {
      const lnurl = m.lud16 ?? m.lud06;
      if (lnurl) {
        this.#zapperQueue.push({
          pubkey: m.pubkey,
          lnurl,
        });
      }
      if (m.nip05) {
        this.#nip5Queue.push({
          pubkey: m.pubkey,
          nip05: m.nip05,
        });
      }
    }
    return updateType;
  }

  takeSnapshot(): CachedMetadata[] {
    return [...this.cache.values()];
  }

  async #processZapperQueue() {
    await this.#batchQueue(
      this.#zapperQueue,
      async i => {
        const svc = new LNURL(i.lnurl);
        await svc.load();
        const p = this.getFromCache(i.pubkey);
        if (p) {
          await this.set({
            ...p,
            zapService: svc.zapperPubkey,
          });
        }
      },
      5,
    );

    setTimeout(() => this.#processZapperQueue(), 1_000);
  }

  async #processNip5Queue() {
    await this.#batchQueue(
      this.#nip5Queue,
      async i => {
        const [name, domain] = i.nip05.split("@");
        const nip5pk = await fetchNip05Pubkey(name, domain);
        const p = this.getFromCache(i.pubkey);
        if (p) {
          await this.set({
            ...p,
            isNostrAddressValid: i.pubkey === nip5pk,
          });
        }
      },
      5,
    );

    setTimeout(() => this.#processNip5Queue(), 1_000);
  }

  async #batchQueue<T>(queue: Array<T>, proc: (v: T) => Promise<void>, batchSize = 3) {
    const batch = [];
    while (queue.length > 0) {
      const i = queue.shift();
      if (i) {
        batch.push(
          (async () => {
            try {
              await proc(i);
            } catch {
              console.warn("Failed to process item", i);
            }
            batch.pop(); // pop any
          })(),
        );
        if (batch.length === batchSize) {
          await Promise.all(batch);
        }
      } else {
        await Promise.all(batch);
      }
    }
  }
}
