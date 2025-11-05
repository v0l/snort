import { unixNowMs } from "@snort/shared";
import { CacheRelay, EventKind, NostrEvent, UsersRelays, parseRelaysFromKind } from "@snort/system";
import { WorkerBaseCache } from "./worker-cached";

export class RelaysWorkerCache extends WorkerBaseCache<UsersRelays> {
  constructor(relay: CacheRelay) {
    super(EventKind.Relays, relay);
  }

  name(): string {
    return "Relays";
  }

  maxSize(): number {
    return 5_000;
  }

  mapper(ev: NostrEvent): UsersRelays | undefined {
    const relays = parseRelaysFromKind(ev);
    if (!relays) return;

    return {
      pubkey: ev.pubkey,
      loaded: unixNowMs(),
      created: ev.created_at,
      relays: relays,
    };
  }

  override async preload(follows?: Array<string>) {
    await super.preload();

    // load relay lists for follows
    if (follows) {
      await this.preloadTable(`${this.name()}-preload-follows`, {
        kinds: [EventKind.Relays],
        authors: follows,
      });
    }
  }
}
