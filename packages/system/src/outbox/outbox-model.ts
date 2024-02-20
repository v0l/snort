import { EventKind, NostrEvent, ReqFilter, RequestBuilder, SystemInterface } from "..";
import { dedupe, removeUndefined, unixNowMs, unwrap } from "@snort/shared";
import { FlatReqFilter } from "../query-optimizer";
import { RelayListCacheExpire } from "../const";
import { AuthorsRelaysCache, EventFetcher, PickedRelays, DefaultPickNRelays, parseRelaysFromKind } from ".";
import debug from "debug";
import { BaseRequestRouter, RelayTaggedFilter, RelayTaggedFlatFilters } from "../request-router";

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
    return new OutboxModel(system.relayCache, system);
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
  forRequest(filter: ReqFilter, pickN?: number): Array<RelayTaggedFilter> {
    const authors = filter.authors;
    if ((authors?.length ?? 0) === 0) {
      return [
        {
          relay: "",
          filter,
        },
      ];
    }

    const topRelays = this.pickTopRelays(unwrap(authors), pickN ?? DefaultPickNRelays, "write");
    const pickedRelays = dedupe(topRelays.flatMap(a => a.relays));

    const picked = pickedRelays.map(a => {
      const keysOnPickedRelay = dedupe(topRelays.filter(b => b.relays.includes(a)).map(b => b.key));
      return {
        relay: a,
        filter: {
          ...filter,
          authors: keysOnPickedRelay,
        },
      } as RelayTaggedFilter;
    });
    const noRelays = dedupe(topRelays.filter(a => a.relays.length === 0).map(a => a.key));
    if (noRelays.length > 0) {
      picked.push({
        relay: "",
        filter: {
          ...filter,
          authors: noRelays,
        },
      });
    }
    this.#log("Picked %O => %O", filter, picked);
    return picked;
  }

  /**
   * Split a flat request filter by authors
   * @param filter Filter to split
   * @param pickN Number of relays to pick per author
   * @returns
   */
  forFlatRequest(input: Array<FlatReqFilter>, pickN?: number): Array<RelayTaggedFlatFilters> {
    const authors = input.filter(a => a.authors).map(a => unwrap(a.authors));
    if (authors.length === 0) {
      return [
        {
          relay: "",
          filters: input,
        },
      ];
    }
    const topRelays = this.pickTopRelays(authors, pickN ?? DefaultPickNRelays, "write");
    const pickedRelays = dedupe(topRelays.flatMap(a => a.relays));

    const picked = pickedRelays.map(a => {
      const authorsOnRelay = new Set(topRelays.filter(v => v.relays.includes(a)).map(v => v.key));
      return {
        relay: a,
        filters: input.filter(v => v.authors && authorsOnRelay.has(v.authors)),
      } as RelayTaggedFlatFilters;
    });
    const noRelays = new Set(topRelays.filter(v => v.relays.length === 0).map(v => v.key));
    if (noRelays.size > 0) {
      picked.push({
        relay: "",
        filters: input.filter(v => !v.authors || noRelays.has(v.authors)),
      } as RelayTaggedFlatFilters);
    }

    this.#log("Picked %d relays from %d filters", picked.length, input.length);
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
    const ret = removeUndefined(dedupe(relays.map(a => a.relays).flat()));
    this.#log("Picked %O from authors %O", ret, recipients);
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
