import { type CachedMetadata, type CacheRelay, EventKind, mapEventToProfile, type NostrEvent } from "@snort/system";
import { WorkerBaseCache } from "./worker-cached";

export class ProfileCacheRelayWorker extends WorkerBaseCache<CachedMetadata> {
  constructor(relay: CacheRelay) {
    super(EventKind.SetMetadata, relay);
  }

  name(): string {
    return "Profiles";
  }

  maxSize(): number {
    return 5_000;
  }

  mapper(ev: NostrEvent): CachedMetadata | undefined {
    return mapEventToProfile(ev);
  }

  override async preload(follows?: Array<string>) {
    await super.preload();

    // load relay lists for follows
    if (follows) {
      await this.preloadTable(`${this.name()}-preload-follows`, {
        kinds: [EventKind.SetMetadata],
        authors: follows,
      });
    }
  }
}
