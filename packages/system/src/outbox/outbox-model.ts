import { EventKind, type NostrEvent, parseRelaysFromKind, type ReqFilter, RequestBuilder, type SystemInterface } from "..";
import { appendDedupe, dedupe, removeUndefined, unixNowMs, unwrap } from "@snort/shared";
import type { FlatReqFilter } from "../query-optimizer";
import { RelayListCacheExpire } from "../const";
import { type AuthorsRelaysCache, type EventFetcher, type PickedRelays, DefaultPickNRelays } from ".";
import debug from "debug";
import { BaseRequestRouter } from "../request-router";

/**
 * Simple outbox model using most popular relays
 */
export class OutboxModel extends BaseRequestRouter {
  #log = debug("OutboxModel");
  #relays: AuthorsRelaysCache;
  #fetcher: EventFetcher;

  constructor(relays: AuthorsRelaysCache, fetcher: EventFetcher) {
    super();
    this.#relays = relays;
    this.#fetcher = fetcher;
  }

  static fromSystem(system: SystemInterface) {
    return new OutboxModel(system.config.relays, system);
  }

  /**
   * Pick top relays for each user
   * @param authors The authors whos relays will be picked
   * @param pickN Number of relays to pick per pubkey
   * @param type Read/Write relays
   * @returns
   */
  pickTopRelays(authors: Array<string>, pickN: number, type: "write" | "read"): Array<PickedRelays> {
    // map of pubkey -> [write relays]
    const allRelays = authors.map(a => {
      return {
        key: a,
        relays: this.#relays
          .getFromCache(a)
          ?.relays?.filter(a => (type === "write" ? a.settings.write : a.settings.read))
          .sort(() => (Math.random() < 0.5 ? 1 : -1)),
      };
    });

    const missing = allRelays.filter(a => a.relays === undefined || a.relays.length === 0);
    const hasRelays = allRelays.filter(a => a.relays !== undefined && a.relays.length > 0);

    // map of relay -> [pubkeys]
    const relayUserMap = hasRelays.reduce((acc, v) => {
      for (const r of unwrap(v.relays)) {
        if (!acc.has(r.url)) {
          acc.set(r.url, new Set([v.key]));
        } else {
          unwrap(acc.get(r.url)).add(v.key);
        }
      }
      return acc;
    }, new Map<string, Set<string>>());

    // selection algo will just pick relays with the most users
    const topRelays = [...relayUserMap.entries()].sort(([, v], [, v1]) => v1.size - v.size);

    if (missing.length > 0) {
      this.#log("No relay metadata found, outbox model will not work for %O", missing);
    }
    // <relay, key[]> - count keys per relay
    // <key, relay[]> - pick n top relays
    // <relay, key[]> - map keys per relay (for subscription filter)
    return hasRelays
      .map(k => {
        // pick top N relays for this key
        const relaysForKey = topRelays
          .filter(([, v]) => v.has(k.key))
          .slice(0, pickN)
          .map(([k]) => k);
        return { key: k.key, relays: relaysForKey };
      })
      .concat(
        missing.map(a => {
          return {
            key: a.key,
            relays: [],
          };
        }),
      );
  }

  /**
   * Split a request filter by authors
   * @param filter Filter to split
   * @param pickN Number of relays to pick per author
   * @returns
   */
  forRequest(filter: ReqFilter, pickN?: number): Array<ReqFilter> {
    // when sending a request prioritize the #p filter over authors
    const pattern = filter["#p"] !== undefined ? "inbox" : "outbox";
    const key = filter["#p"] !== undefined ? "#p" : "authors";
    const authors = filter[key];
    if ((authors?.length ?? 0) === 0) {
      return [filter];
    }

    const topWriteRelays = this.pickTopRelays(
      unwrap(authors),
      pickN ?? DefaultPickNRelays,
      pattern === "inbox" ? "read" : "write",
    );
    const pickedRelays = dedupe(topWriteRelays.flatMap(a => a.relays));

    const picked = pickedRelays.map(a => {
      const keysOnPickedRelay = dedupe(topWriteRelays.filter(b => b.relays.includes(a)).map(b => b.key));
      return {
        ...filter,
        [key]: keysOnPickedRelay,
        relays: appendDedupe(filter.relays, [a]),
      } as ReqFilter;
    });
    const noRelays = dedupe(topWriteRelays.filter(a => a.relays.length === 0).map(a => a.key));
    if (noRelays.length > 0) {
      picked.push({
        ...filter,
        [key]: noRelays,
      } as ReqFilter);
    }
    this.#log("Picked: pattern=%s, input=%O, output=%O", pattern, filter, picked);
    return picked;
  }

  /**
   * Split a flat request filter by authors
   * @param filter Filter to split
   * @param pickN Number of relays to pick per author
   * @returns
   */
  forFlatRequest(input: Array<FlatReqFilter>, pickN?: number): Array<FlatReqFilter> {
    const authors = removeUndefined(input.flatMap(a => a.authors));
    if (authors.length === 0) {
      return input;
    }
    const topRelays = this.pickTopRelays(authors, pickN ?? DefaultPickNRelays, "write");
    const pickedRelays = dedupe(topRelays.flatMap(a => a.relays));

    const picked = pickedRelays.flatMap(a => {
      const authorsOnRelay = new Set(topRelays.filter(v => v.relays.includes(a)).map(v => v.key));
      return input
        .filter(v => v.authors && authorsOnRelay.has(v.authors))
        .flatMap(b => {
          // if flat filter isnt already relay tagged, set relay tag or
          // create a duplicate filter with the authors picked relay
          if (!b.relay) {
            b.relay = a;
            return [b];
          } else {
            return [b, { ...b, relay: a }];
          }
        });
    });
    const noRelays = new Set(topRelays.filter(v => v.relays.length === 0).map(v => v.key));
    if (noRelays.size > 0) {
      picked.push(...input.filter(v => !v.authors || noRelays.has(v.authors)));
    }

    this.#log("Picked: pattern=%s, input=%O, output=%O", "outbox", input, picked);
    return picked;
  }

  /**
   * Pick relay inboxs for replies
   * @param ev The reply event to send
   * @param system Nostr system interface
   * @param pickN Number of relays to pick per recipient
   * @returns
   */
  async forReply(ev: NostrEvent, pickN?: number) {
    const recipients = dedupe([ev.pubkey, ...ev.tags.filter(a => a[0] === "p").map(a => a[1])]);
    await this.updateRelayLists(recipients);
    const relays = this.pickTopRelays(recipients, pickN ?? DefaultPickNRelays, "read");
    const ret = removeUndefined(dedupe(relays.flatMap(a => a.relays)));

    this.#log("Picked: pattern=%s, input=%O, output=%O", "inbox", ev, ret);
    return ret;
  }

  async forReplyTo(pk: string, pickN?: number | undefined): Promise<string[]> {
    const recipients = [pk];
    await this.updateRelayLists(recipients);
    const relays = this.pickTopRelays(recipients, pickN ?? DefaultPickNRelays, "read");
    const ret = removeUndefined(dedupe(relays.flatMap(a => a.relays)));

    this.#log("Picked: pattern=%s, input=%s, output=%O", "inbox", pk, ret);
    return ret;
  }

  /**
   * Update relay cache with latest relay lists
   * @param authors The authors to update relay lists for
   */
  async updateRelayLists(authors: Array<string>) {
    await this.#relays.buffer(authors);
    const expire = unixNowMs() - RelayListCacheExpire;
    const expired = authors.filter(a => (this.#relays.getFromCache(a)?.loaded ?? 0) < expire);
    if (expired.length > 0) {
      this.#log("Updating relays for authors: %O", expired);
      const rb = new RequestBuilder("system-update-relays-for-outbox");
      rb.withFilter().authors(expired).kinds([EventKind.Relays, EventKind.ContactList]);
      const relayLists = await this.#fetcher.Fetch(rb);
      await this.#relays.bulkSet(
        removeUndefined(
          relayLists.map(a => {
            const relays = parseRelaysFromKind(a);
            if (!relays) return;
            return {
              relays: relays,
              pubkey: a.pubkey,
              created: a.created_at,
              loaded: unixNowMs(),
            };
          }),
        ),
      );
    }
  }
}
