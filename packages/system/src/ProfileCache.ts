
import debug from "debug";
import { unixNowMs, FeedCache } from "@snort/shared";
import { EventKind, HexKey, SystemInterface, TaggedRawEvent, PubkeyReplaceableNoteStore, RequestBuilder } from ".";
import { ProfileCacheExpire } from "./Const";
import { mapEventToProfile, MetadataCache } from "./cache";

export class ProfileLoaderService {
  #system: SystemInterface;
  #cache: FeedCache<MetadataCache>;

  /**
   * List of pubkeys to fetch metadata for
   */
  WantsMetadata: Set<HexKey> = new Set();

  readonly #log = debug("ProfileCache");

  constructor(system: SystemInterface, cache: FeedCache<MetadataCache>) {
    this.#system = system;
    this.#cache = cache;
    this.#FetchMetadata();
  }

  /**
   * Request profile metadata for a set of pubkeys
   */
  TrackMetadata(pk: HexKey | Array<HexKey>) {
    const bufferNow = [];
    for (const p of Array.isArray(pk) ? pk : [pk]) {
      if (p.length > 0 && this.WantsMetadata.add(p)) {
        bufferNow.push(p);
      }
    }
    this.#cache.buffer(bufferNow);
  }

  /**
   * Stop tracking metadata for a set of pubkeys
   */
  UntrackMetadata(pk: HexKey | Array<HexKey>) {
    for (const p of Array.isArray(pk) ? pk : [pk]) {
      if (p.length > 0) {
        this.WantsMetadata.delete(p);
      }
    }
  }

  async onProfileEvent(e: Readonly<TaggedRawEvent>) {
    const profile = mapEventToProfile(e);
    if (profile) {
      await this.#cache.update(profile);
    }
  }

  async #FetchMetadata() {
    const missingFromCache = await this.#cache.buffer([...this.WantsMetadata]);

    const expire = unixNowMs() - ProfileCacheExpire;
    const expired = [...this.WantsMetadata]
      .filter(a => !missingFromCache.includes(a))
      .filter(a => (this.#cache.getFromCache(a)?.loaded ?? 0) < expire);
    const missing = new Set([...missingFromCache, ...expired]);
    if (missing.size > 0) {
      this.#log("Wants profiles: %d missing, %d expired", missingFromCache.length, expired.length);

      const sub = new RequestBuilder("profiles");
      sub
        .withOptions({
          skipDiff: true,
        })
        .withFilter()
        .kinds([EventKind.SetMetadata])
        .authors([...missing]);

      const newProfiles = new Set<string>();
      const q = this.#system.Query<PubkeyReplaceableNoteStore>(PubkeyReplaceableNoteStore, sub);
      const feed = (q?.feed as PubkeyReplaceableNoteStore) ?? new PubkeyReplaceableNoteStore();
      // never release this callback, it will stop firing anyway after eose
      const releaseOnEvent = feed.onEvent(async e => {
        for (const pe of e) {
          newProfiles.add(pe.id);
          await this.onProfileEvent(pe);
        }
      });
      const results = await new Promise<Readonly<Array<TaggedRawEvent>>>(resolve => {
        let timeout: ReturnType<typeof setTimeout> | undefined = undefined;
        const release = feed.hook(() => {
          if (!feed.loading) {
            clearTimeout(timeout);
            resolve(feed.getSnapshotData() ?? []);
            this.#log("Profiles finished: %s", sub.id);
            release();
          }
        });
        timeout = setTimeout(() => {
          release();
          resolve(feed.getSnapshotData() ?? []);
          this.#log("Profiles timeout: %s", sub.id);
        }, 5_000);
      });

      releaseOnEvent();
      const couldNotFetch = [...missing].filter(a => !results.some(b => b.pubkey === a));
      if (couldNotFetch.length > 0) {
        this.#log("No profiles: %o", couldNotFetch);
        const empty = couldNotFetch.map(a =>
          this.#cache.update({
            pubkey: a,
            loaded: unixNowMs() - ProfileCacheExpire + 5_000, // expire in 5s
            created: 69,
          } as MetadataCache)
        );
        await Promise.all(empty);
      }

      // When we fetch an expired profile and its the same as what we already have
      // onEvent is not fired and the loaded timestamp never gets updated
      const expiredSame = results.filter(a => !newProfiles.has(a.id) && expired.includes(a.pubkey));
      await Promise.all(expiredSame.map(v => this.onProfileEvent(v)));
    }

    setTimeout(() => this.#FetchMetadata(), 500);
  }
}
