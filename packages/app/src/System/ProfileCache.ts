import { EventKind, HexKey, TaggedRawEvent } from "@snort/nostr";
import { ProfileCacheExpire } from "Const";
import { mapEventToProfile, MetadataCache } from "Cache";
import { UserCache } from "Cache/UserCache";
import { PubkeyReplaceableNoteStore, RequestBuilder, System } from "System";
import { unixNowMs } from "SnortUtils";
import debug from "debug";

class ProfileLoaderService {
  /**
   * List of pubkeys to fetch metadata for
   */
  WantsMetadata: Set<HexKey> = new Set();

  readonly #log = debug("ProfileCache");

  constructor() {
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
    UserCache.buffer(bufferNow);
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
      await UserCache.update(profile);
    }
  }

  async #FetchMetadata() {
    const missingFromCache = await UserCache.buffer([...this.WantsMetadata]);

    const expire = unixNowMs() - ProfileCacheExpire;
    const expired = [...this.WantsMetadata]
      .filter(a => !missingFromCache.includes(a))
      .filter(a => (UserCache.getFromCache(a)?.loaded ?? 0) < expire);
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
      const q = System.Query<PubkeyReplaceableNoteStore>(PubkeyReplaceableNoteStore, sub);
      // never release this callback, it will stop firing anyway after eose
      const releaseOnEvent = q.onEvent(async e => {
        for (const pe of e) {
          newProfiles.add(pe.id);
          await this.onProfileEvent(pe);
        }
      });
      const results = await new Promise<Readonly<Array<TaggedRawEvent>>>(resolve => {
        let timeout: ReturnType<typeof setTimeout> | undefined = undefined;
        const release = q.hook(() => {
          if (!q.loading) {
            clearTimeout(timeout);
            resolve(q.getSnapshotData() ?? []);
            this.#log("Profiles finished: %s", sub.id);
            release();
          }
        });
        timeout = setTimeout(() => {
          release();
          resolve(q.getSnapshotData() ?? []);
          this.#log("Profiles timeout: %s", sub.id);
        }, 5_000);
      });

      releaseOnEvent();
      const couldNotFetch = [...missing].filter(a => !results.some(b => b.pubkey === a));
      if (couldNotFetch.length > 0) {
        this.#log("No profiles: %o", couldNotFetch);
        const empty = couldNotFetch.map(a =>
          UserCache.update({
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

export const ProfileLoader = new ProfileLoaderService();
