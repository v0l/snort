import debug from "debug";
import { unixNowMs, FeedCache } from "@snort/shared";
import { EventKind, HexKey, SystemInterface, TaggedNostrEvent, NoteCollection, RequestBuilder } from ".";
import { ProfileCacheExpire } from "./const";
import { mapEventToProfile, MetadataCache } from "./cache";

const MetadataRelays = ["wss://purplepag.es"];

export class ProfileLoaderService {
  #system: SystemInterface;
  #cache: FeedCache<MetadataCache>;

  /**
   * A set of pubkeys we could not find last run,
   * This list will attempt to use known profile metadata relays
   */
  #missingLastRun: Set<string> = new Set();

  /**
   * List of pubkeys to fetch metadata for
   */
  #wantsMetadata: Set<HexKey> = new Set();

  readonly #log = debug("ProfileCache");

  constructor(system: SystemInterface, cache: FeedCache<MetadataCache>) {
    this.#system = system;
    this.#cache = cache;
    this.#FetchMetadata();
  }

  get Cache() {
    return this.#cache;
  }

  /**
   * Request profile metadata for a set of pubkeys
   */
  TrackMetadata(pk: HexKey | Array<HexKey>) {
    for (const p of Array.isArray(pk) ? pk : [pk]) {
      if (p.length === 64) {
        this.#wantsMetadata.add(p);
      }
    }
  }

  /**
   * Stop tracking metadata for a set of pubkeys
   */
  UntrackMetadata(pk: HexKey | Array<HexKey>) {
    for (const p of Array.isArray(pk) ? pk : [pk]) {
      if (p.length > 0) {
        this.#wantsMetadata.delete(p);
      }
    }
  }

  async onProfileEvent(e: Readonly<TaggedNostrEvent>) {
    const profile = mapEventToProfile(e);
    if (profile) {
      await this.#cache.update(profile);
    }
  }

  async fetchProfile(key: string) {
    const existing = this.Cache.get(key);
    if (existing) {
      return existing;
    } else {
      return await new Promise<MetadataCache>((resolve, reject) => {
        this.TrackMetadata(key);
        const release = this.Cache.hook(() => {
          const existing = this.Cache.getFromCache(key);
          if (existing) {
            resolve(existing);
            release();
            this.UntrackMetadata(key);
          }
        }, key);
      });
    }
  }

  async #FetchMetadata() {
    const missingFromCache = await this.#cache.buffer([...this.#wantsMetadata]);

    const expire = unixNowMs() - ProfileCacheExpire;
    const expired = [...this.#wantsMetadata]
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

      if (this.#missingLastRun.size > 0) {
        const fMissing = sub
          .withFilter()
          .kinds([EventKind.SetMetadata])
          .authors([...this.#missingLastRun]);
        MetadataRelays.forEach(r => fMissing.relay(r));
      }
      const newProfiles = new Set<string>();
      const q = this.#system.Query<NoteCollection>(NoteCollection, sub);
      const feed = (q?.feed as NoteCollection) ?? new NoteCollection();
      // never release this callback, it will stop firing anyway after eose
      const releaseOnEvent = feed.onEvent(async e => {
        for (const pe of e) {
          newProfiles.add(pe.id);
          await this.onProfileEvent(pe);
        }
      });
      const results = await new Promise<Readonly<Array<TaggedNostrEvent>>>(resolve => {
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
      this.#missingLastRun = new Set(couldNotFetch);
      if (couldNotFetch.length > 0) {
        this.#log("No profiles: %o", couldNotFetch);
        const empty = couldNotFetch.map(a =>
          this.#cache.update({
            pubkey: a,
            loaded: unixNowMs() - ProfileCacheExpire + 30_000, // expire in 30s
            created: 69,
          } as MetadataCache),
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
