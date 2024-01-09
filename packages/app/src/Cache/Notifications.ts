import { unixNow } from "@snort/shared";
import { EventKind, NostrEvent, RequestBuilder, TaggedNostrEvent } from "@snort/system";

import { db, NostrEventForSession } from "@/Db";
import { Day } from "@/Utils/Const";
import { LoginSession } from "@/Utils/Login";

import { RefreshFeedCache, TWithCreated } from "./RefreshFeedCache";

export class NotificationsCache extends RefreshFeedCache<NostrEventForSession> {
  #kinds = [EventKind.TextNote, EventKind.Reaction, EventKind.Repost, EventKind.ZapReceipt];

  constructor() {
    super("notifications", db.notifications);
  }

  buildSub(session: LoginSession, rb: RequestBuilder) {
    if (session.publicKey) {
      const newest = this.newest(v => v.tags.some(a => a[0] === "p" && a[1] === session.publicKey));
      rb.withFilter()
        .kinds(this.#kinds)
        .tag("p", [session.publicKey])
        .since(newest === 0 ? unixNow() - Day * 30 : newest);
    }
  }

  async onEvent(evs: readonly TaggedNostrEvent[], pubKey: string) {
    const filtered = evs.filter(a => this.#kinds.includes(a.kind) && a.tags.some(b => b[0] === "p"));
    if (filtered.length > 0) {
      await this.bulkSet(
        filtered.map(v => ({
          ...v,
          forSession: pubKey,
        })),
      );
      this.emit(
        "change",
        filtered.map(v => this.key(v)),
      );
    }
  }

  key(of: TWithCreated<NostrEvent>): string {
    return of.id;
  }

  takeSnapshot() {
    return [...this.cache.values()];
  }
}
