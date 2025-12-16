import { unixNowMs } from "@snort/shared";
import { type CacheRelay, EventKind, type NostrEvent, type UsersFollows } from "@snort/system";
import { WorkerBaseCache } from "./worker-cached";

export class UserFollowsWorker extends WorkerBaseCache<UsersFollows> {
  constructor(relay: CacheRelay) {
    super(EventKind.ContactList, relay);
  }

  name(): string {
    return "Follows";
  }

  maxSize(): number {
    return 5_000;
  }

  mapper(ev: NostrEvent): UsersFollows | undefined {
    if (ev.kind !== EventKind.ContactList) return;

    return {
      pubkey: ev.pubkey,
      loaded: unixNowMs(),
      created: ev.created_at,
      follows: ev.tags,
    };
  }

  override async preload(follows?: Array<string>) {
    await super.preload();

    // load relay lists for follows
    if (follows) {
      await this.preloadTable(`${this.name()}-preload-follows`, {
        kinds: [EventKind.ContactList],
        authors: follows,
      });
    }
  }
}
