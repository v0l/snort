import {
  EventKind,
  FullRelaySettings,
  NostrEvent,
  ReqFilter,
  RequestBuilder,
  SystemInterface,
  TaggedNostrEvent,
  UsersRelays,
} from ".";
import { dedupe, removeUndefined, sanitizeRelayUrl, unixNowMs, unwrap } from "@snort/shared";
import debug from "debug";
import { FlatReqFilter } from "./query-optimizer";
import { RelayListCacheExpire } from "./const";
import { BackgroundLoader } from "./background-loader";

const DefaultPickNRelays = 2;

export interface RelayTaggedFilter {
  relay: string;
  filter: ReqFilter;
}

export interface RelayTaggedFlatFilters {
  relay: string;
  filters: Array<FlatReqFilter>;
}

export interface RelayTaggedFilters {
  relay: string;
  filters: Array<ReqFilter>;
}

const logger = debug("OutboxModel");

export interface RelayCache {
  getFromCache(pubkey?: string): UsersRelays | undefined;
  update(obj: UsersRelays): Promise<"new" | "updated" | "refresh" | "no_change">;
  buffer(keys: Array<string>): Promise<Array<string>>;
  bulkSet(objs: Array<UsersRelays>): Promise<void>;
}

export function splitAllByWriteRelays(cache: RelayCache, filters: Array<ReqFilter>) {
  const allSplit = filters
    .map(a => splitByWriteRelays(cache, a))
    .reduce((acc, v) => {
      for (const vn of v) {
        const existing = acc.get(vn.relay);
        if (existing) {
          existing.push(vn.filter);
        } else {
          acc.set(vn.relay, [vn.filter]);
        }
      }
      return acc;
    }, new Map<string, Array<ReqFilter>>());

  return [...allSplit.entries()].map(([k, v]) => {
    return {
      relay: k,
      filters: v,
    } as RelayTaggedFilters;
  });
}

/**
 * Split filters by authors
 */
export function splitByWriteRelays(cache: RelayCache, filter: ReqFilter, pickN?: number): Array<RelayTaggedFilter> {
  const authors = filter.authors;
  if ((authors?.length ?? 0) === 0) {
    return [
      {
        relay: "",
        filter,
      },
    ];
  }

  const topRelays = pickTopRelays(cache, unwrap(authors), pickN ?? DefaultPickNRelays, "write");
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
  logger("Picked %O => %O", filter, picked);
  return picked;
}

/**
 * Split filters by author
 */
export function splitFlatByWriteRelays(
  cache: RelayCache,
  input: Array<FlatReqFilter>,
  pickN?: number,
): Array<RelayTaggedFlatFilters> {
  const authors = input.filter(a => a.authors).map(a => unwrap(a.authors));
  if (authors.length === 0) {
    return [
      {
        relay: "",
        filters: input,
      },
    ];
  }
  const topRelays = pickTopRelays(cache, authors, pickN ?? DefaultPickNRelays, "write");
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

  logger("Picked %d relays from %d filters", picked.length, input.length);
  return picked;
}

/**
 * Pick most popular relays for each authors
 */
export function pickTopRelays(cache: RelayCache, authors: Array<string>, n: number, type: "write" | "read") {
  // map of pubkey -> [write relays]
  const allRelays = authors.map(a => {
    return {
      key: a,
      relays: cache
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
        .slice(0, n)
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
 * Pick read relays for sending reply events
 */
export async function pickRelaysForReply(ev: NostrEvent, system: SystemInterface, pickN?: number) {
  const recipients = dedupe(ev.tags.filter(a => a[0] === "p").map(a => a[1]));
  await updateRelayLists(recipients, system);
  const relays = pickTopRelays(system.relayCache, recipients, pickN ?? DefaultPickNRelays, "read");
  const ret = removeUndefined(dedupe(relays.map(a => a.relays).flat()));
  logger("Picked %O from authors %O", ret, recipients);
  return ret;
}

export function parseRelayTag(tag: Array<string>) {
  return {
    url: sanitizeRelayUrl(tag[1]),
    settings: {
      read: tag[2] === "read" || tag[2] === undefined,
      write: tag[2] === "write" || tag[2] === undefined,
    },
  } as FullRelaySettings;
}

export function parseRelayTags(tag: Array<Array<string>>) {
  return tag.map(parseRelayTag).filter(a => a !== null);
}

export function parseRelaysFromKind(ev: NostrEvent) {
  if (ev.kind === EventKind.ContactList) {
    const relaysInContent =
      ev.content.length > 0 ? (JSON.parse(ev.content) as Record<string, { read: boolean; write: boolean }>) : undefined;
    if (relaysInContent) {
      return Object.entries(relaysInContent).map(
        ([k, v]) =>
          ({
            url: sanitizeRelayUrl(k),
            settings: {
              read: v.read,
              write: v.write,
            },
          }) as FullRelaySettings,
      );
    }
  } else if (ev.kind === EventKind.Relays) {
    return parseRelayTags(ev.tags);
  }
}

export async function updateRelayLists(authors: Array<string>, system: SystemInterface) {
  await system.relayCache.buffer(authors);
  const expire = unixNowMs() - RelayListCacheExpire;
  const expired = authors.filter(a => (system.relayCache.getFromCache(a)?.loaded ?? 0) < expire);
  if (expired.length > 0) {
    logger("Updating relays for authors: %O", expired);
    const rb = new RequestBuilder("system-update-relays-for-outbox");
    rb.withFilter().authors(expired).kinds([EventKind.Relays, EventKind.ContactList]);
    const relayLists = await system.Fetch(rb);
    await system.relayCache.bulkSet(
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

export class RelayMetadataLoader extends BackgroundLoader<UsersRelays> {
  override name(): string {
    return "RelayMetadataLoader";
  }

  override onEvent(e: Readonly<TaggedNostrEvent>): UsersRelays | undefined {
    const relays = parseRelaysFromKind(e);
    if (!relays) return;
    return {
      relays: relays,
      pubkey: e.pubkey,
      created: e.created_at,
      loaded: unixNowMs(),
    };
  }

  override getExpireCutoff(): number {
    return unixNowMs() - RelayListCacheExpire;
  }

  protected override buildSub(missing: string[]): RequestBuilder {
    const rb = new RequestBuilder("relay-loader");
    rb.withOptions({
      skipDiff: true,
      timeout: 10_000,
      outboxPickN: 4,
    });
    rb.withFilter().authors(missing).kinds([EventKind.Relays, EventKind.ContactList]);
    return rb;
  }

  protected override makePlaceholder(key: string): UsersRelays | undefined {
    return {
      relays: [],
      pubkey: key,
      created: 0,
      loaded: this.getExpireCutoff() + 300_000,
    };
  }
}
