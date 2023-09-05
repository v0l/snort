import debug from "debug";
import { EventKind, RequestBuilder, SystemInterface, TaggedNostrEvent } from "@snort/system";
import { unixNow, unixNowMs } from "@snort/shared";

import { db } from "Db";
import { RefreshFeedCache, TWithCreated } from "./RefreshFeedCache";
import { LoginSession } from "Login";
import { Day, Hour } from "Const";

const WindowSize = Hour * 6;
const MaxCacheWindow = Day * 7;

export class FollowsFeedCache extends RefreshFeedCache<TaggedNostrEvent> {
  #kinds = [EventKind.TextNote, EventKind.Repost, EventKind.Polls];
  #oldest: number = 0;

  constructor() {
    super("FollowsFeedCache", db.followsFeed);
  }

  key(of: TWithCreated<TaggedNostrEvent>): string {
    return of.id;
  }

  takeSnapshot(): TWithCreated<TaggedNostrEvent>[] {
    return [...this.cache.values()];
  }

  buildSub(session: LoginSession, rb: RequestBuilder): void {
    const since = this.newest();
    rb.withFilter()
      .kinds(this.#kinds)
      .authors(session.follows.item)
      .since(since === 0 ? unixNow() - WindowSize : since);
  }

  async onEvent(evs: readonly TaggedNostrEvent[]): Promise<void> {
    const filtered = evs.filter(a => this.#kinds.includes(a.kind));
    if (filtered.length > 0) {
      await this.bulkSet(filtered);
      this.notifyChange(filtered.map(a => this.key(a)));
    }
  }

  override async preload() {
    const start = unixNowMs();
    const keys = (await this.table?.toCollection().primaryKeys()) ?? [];
    this.onTable = new Set<string>(keys.map(a => a as string));

    // load only latest 10 posts, rest can be loaded on-demand
    const latest = await this.table?.orderBy("created_at").reverse().limit(50).toArray();
    latest?.forEach(v => this.cache.set(this.key(v), v));

    // cleanup older than 7 days
    await this.table
      ?.where("created_at")
      .below(unixNow() - MaxCacheWindow)
      .delete();

    const oldest = await this.table?.orderBy("created_at").first();
    this.#oldest = oldest?.created_at ?? 0;
    this.notifyChange(latest?.map(a => this.key(a)) ?? []);

    debug(this.name)(`Loaded %d/%d in %d ms`, latest?.length ?? 0, keys.length, (unixNowMs() - start).toLocaleString());
  }

  async loadMore(system: SystemInterface, session: LoginSession, before: number) {
    if (before <= this.#oldest) {
      const rb = new RequestBuilder(`${this.name}-loadmore`);
      rb.withFilter()
        .kinds(this.#kinds)
        .authors(session.follows.item)
        .until(before)
        .since(before - WindowSize);
      await system.Fetch(rb, async evs => {
        await this.bulkSet(evs);
      });
    } else {
      const latest = await this.table
        ?.where("created_at")
        .between(before - WindowSize, before)
        .reverse()
        .sortBy("created_at");
      latest?.forEach(v => {
        const k = this.key(v);
        this.cache.set(k, v);
        this.onTable.add(k);
      });

      this.notifyChange(latest?.map(a => this.key(a)) ?? []);
    }
  }

  /**
   * Backfill cache with new follows
   */
  async backFill(system: SystemInterface, keys: Array<string>) {
    if (keys.length === 0) return;

    const rb = new RequestBuilder(`${this.name}-backfill`);
    rb.withFilter()
      .kinds(this.#kinds)
      .authors(keys)
      .until(unixNow())
      .since(this.#oldest ?? unixNow() - MaxCacheWindow);
    await system.Fetch(rb, async evs => {
      await this.bulkSet(evs);
    });
  }

  /**
   * Backfill cache based on follows list
   */
  async backFillIfMissing(system: SystemInterface, keys: Array<string>) {
    const start = unixNowMs();
    const everything = await this.table?.toArray();
    const allKeys = new Set(everything?.map(a => a.pubkey));
    const missingKeys = keys.filter(a => !allKeys.has(a));
    await this.backFill(system, missingKeys);
    debug(this.name)(`Backfilled %d keys in %d ms`, missingKeys.length, (unixNowMs() - start).toLocaleString());
  }
}
