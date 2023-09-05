import { EventKind, EventPublisher, RequestBuilder, TaggedNostrEvent } from "@snort/system";
import { UnwrappedGift, db } from "Db";
import { findTag, unwrap } from "SnortUtils";
import { RefreshFeedCache } from "./RefreshFeedCache";
import { LoginSession } from "Login";

export class GiftWrapCache extends RefreshFeedCache<UnwrappedGift> {
  constructor() {
    super("GiftWrapCache", db.gifts);
  }

  key(of: UnwrappedGift): string {
    return of.id;
  }

  buildSub(session: LoginSession, rb: RequestBuilder): void {
    const pubkey = session.publicKey;
    if (pubkey) {
      rb.withFilter().kinds([EventKind.GiftWrap]).tag("p", [pubkey]).since(this.newest());
    }
  }

  takeSnapshot(): Array<UnwrappedGift> {
    return [...this.cache.values()];
  }

  override async onEvent(evs: Array<TaggedNostrEvent>, pub: EventPublisher) {
    const unwrapped = (
      await Promise.all(
        evs.map(async v => {
          try {
            return {
              id: v.id,
              to: findTag(v, "p"),
              created_at: v.created_at,
              inner: await pub.unwrapGift(v),
            } as UnwrappedGift;
          } catch (e) {
            console.debug(e, v);
          }
        })
      )
    )
      .filter(a => a !== undefined)
      .map(unwrap);

    // HACK: unseal to get p tags
    for (const u of unwrapped) {
      if (u.inner.kind === EventKind.SealedRumor) {
        const unsealed = await pub.unsealRumor(u.inner);
        u.tags = unsealed.tags;
      }
    }
    await this.bulkSet(unwrapped);
  }
}
