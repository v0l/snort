import { FeedCache } from "@snort/shared";
import { EventKind, EventPublisher, TaggedNostrEvent } from "@snort/system";
import { UnwrappedGift, db } from "Db";
import { findTag, unwrap } from "SnortUtils";

export class GiftWrapCache extends FeedCache<UnwrappedGift> {
  constructor() {
    super("GiftWrapCache", db.gifts);
  }

  key(of: UnwrappedGift): string {
    return of.id;
  }

  override async preload(): Promise<void> {
    await super.preload();
    await this.buffer([...this.onTable]);
  }

  newest(): number {
    let ret = 0;
    this.cache.forEach(v => (ret = v.created_at > ret ? v.created_at : ret));
    return ret;
  }

  takeSnapshot(): Array<UnwrappedGift> {
    return [...this.cache.values()];
  }

  async onEvent(evs: Array<TaggedNostrEvent>, pub: EventPublisher) {
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
