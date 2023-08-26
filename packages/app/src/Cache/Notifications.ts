import { EventKind, NostrEvent, RequestBuilder, TaggedNostrEvent } from "@snort/system";
import { RefreshFeedCache, TWithCreated } from "./RefreshFeedCache";
import { LoginSession } from "Login";
import { unixNow } from "SnortUtils";
import { db } from "Db";

export class NotificationsCache extends RefreshFeedCache<NostrEvent> {
  #kinds = [EventKind.TextNote, EventKind.Reaction, EventKind.Repost, EventKind.ZapReceipt];

  constructor() {
    super("notifications", db.notifications);
  }

  buildSub(session: LoginSession, rb: RequestBuilder) {
    if (session.publicKey) {
      const newest = this.newest();
      rb.withFilter()
        .kinds(this.#kinds)
        .tag("p", [session.publicKey])
        .since(newest === 0 ? unixNow() - 60 * 60 * 24 * 30 : newest);
    }
  }

  async onEvent(evs: readonly TaggedNostrEvent[]) {
    const filtered = evs.filter(a => this.#kinds.includes(a.kind) && a.tags.some(b => b[0] === "p"));
    if (filtered.length > 0) {
      await this.bulkSet(filtered);
      this.notifyChange(filtered.map(v => this.key(v)));
    }
  }

  key(of: TWithCreated<NostrEvent>): string {
    return of.id;
  }

  takeSnapshot(): TWithCreated<NostrEvent>[] {
    return [...this.cache.values()];
  }
}
