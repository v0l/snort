import { EventKind, type EventPublisher, type NostrEvent, type TaggedNostrEvent } from "@snort/system";

import { findTag, unwrap } from "@/Utils";

import { RefreshFeedCache, type TWithCreated } from "./RefreshFeedCache";

export interface UnwrappedGift {
  id: string;
  to: string;
  created_at: number;
  inner: NostrEvent;
  tags?: Array<Array<string>>; // some tags extracted
}

export class GiftWrapCache extends RefreshFeedCache<UnwrappedGift> {
  constructor() {
    super("GiftWrapCache");
  }

  key(of: UnwrappedGift): string {
    return of.id;
  }

  buildSub(): void {
    // not used
  }

  takeSnapshot(): Array<UnwrappedGift> {
    return [...this.cache.values()];
  }

  override async onEvent(evs: Array<TaggedNostrEvent>, _: string, pub?: EventPublisher) {
    if (!pub) return;

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
        }),
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

  search(): Promise<TWithCreated<UnwrappedGift>[]> {
    throw new Error("Method not implemented.");
  }
}
