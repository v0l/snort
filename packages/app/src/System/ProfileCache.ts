import { EventKind, HexKey, TaggedRawEvent } from "@snort/nostr";
import { ProfileCacheExpire } from "Const";
import { mapEventToProfile, MetadataCache } from "Cache";
import { UserCache } from "Cache/UserCache";
import { PubkeyReplaceableNoteStore, RequestBuilder, System } from "System";
import { unixNowMs } from "SnortUtils";

class ProfileLoaderService {
  /**
   * List of pubkeys to fetch metadata for
   */
  WantsMetadata: Set<HexKey> = new Set();

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

  async onProfileEvent(ev: Readonly<Array<TaggedRawEvent>>) {
    for (const e of ev) {
      const profile = mapEventToProfile(e);
      if (profile) {
        await UserCache.update(profile);
      }
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
      console.debug(`[UserCache] Wants profiles: ${missingFromCache.length} missing, ${expired.length} expired`);

      const sub = new RequestBuilder(`profiles`);
      sub
        .withFilter()
        .kinds([EventKind.SetMetadata])
        .authors([...missing]);

      const q = System.Query<PubkeyReplaceableNoteStore>(PubkeyReplaceableNoteStore, sub);
      // never release this callback, it will stop firing anyway after eose
      const releaseOnEvent = q.onEvent(async e => {
        await this.onProfileEvent(e);
      });
      const results = await new Promise<Readonly<Array<TaggedRawEvent>>>(resolve => {
        let timeout: ReturnType<typeof setTimeout> | undefined = undefined;
        const release = q.hook(() => {
          if (!q.loading) {
            clearTimeout(timeout);
            resolve(q.getSnapshotData() ?? []);
            console.debug("Profiles finished: ", sub.id);
            release();
          }
        });
        timeout = setTimeout(() => {
          release();
          resolve(q.getSnapshotData() ?? []);
          console.debug("Profiles timeout: ", sub.id);
        }, 5_000);
      });

      releaseOnEvent();
      const couldNotFetch = [...missing].filter(a => !results.some(b => b.pubkey === a));
      if (couldNotFetch.length > 0) {
        console.debug("No profiles: ", couldNotFetch);
        const empty = couldNotFetch.map(a =>
          UserCache.update({
            pubkey: a,
            loaded: unixNowMs() - ProfileCacheExpire + 5_000, // expire in 5s
            created: 69,
          } as MetadataCache)
        );
        await Promise.all(empty);
      }
    }

    setTimeout(() => this.#FetchMetadata(), 500);
  }
}

export const ProfileLoader = new ProfileLoaderService();
