import { db } from "Db";
import { unixNowMs } from "@snort/shared";
import { EventKind, RequestBuilder, socialGraphInstance, TaggedNostrEvent } from "@snort/system";
import { RefreshFeedCache } from "./RefreshFeedCache";
import { LoginSession } from "Login";

export class FollowListCache extends RefreshFeedCache<TaggedNostrEvent> {
  constructor() {
    super("FollowListCache", db.followLists);
  }

  buildSub(session: LoginSession, rb: RequestBuilder): void {
    const since = this.newest();
    rb.withFilter()
      .kinds([EventKind.ContactList])
      .authors(session.follows.item)
      .since(since === 0 ? undefined : since);
  }

  async onEvent(evs: readonly TaggedNostrEvent[]) {
    await Promise.all(
      evs.map(async e => {
        const update = await super.update({
          ...e,
          created: e.created_at,
          loaded: unixNowMs(),
        });
        if (update !== "no_change") {
          socialGraphInstance.handleFollowEvent(e);
        }
      }),
    );
  }

  key(of: TaggedNostrEvent): string {
    return of.pubkey;
  }

  takeSnapshot() {
    return [...this.cache.values()];
  }

  override async preload() {
    await super.preload();
    this.snapshot().forEach(e => socialGraphInstance.handleFollowEvent(e));
  }
}
