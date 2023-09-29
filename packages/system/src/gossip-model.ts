import { ReqFilter, UsersRelays } from ".";
import { dedupe, unwrap } from "@snort/shared";
import debug from "debug";
import { FlatReqFilter } from "./query-optimizer";

const PickNRelays = 2;

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

export interface RelayCache {
  getFromCache(pubkey?: string): UsersRelays | undefined;
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
export function splitByWriteRelays(cache: RelayCache, filter: ReqFilter): Array<RelayTaggedFilter> {
  const authors = filter.authors;
  if ((authors?.length ?? 0) === 0) {
    return [
      {
        relay: "",
        filter,
      },
    ];
  }

  const topRelays = pickTopRelays(cache, unwrap(authors), PickNRelays);
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
  debug("GOSSIP")("Picked %O => %O", filter, picked);
  return picked;
}

/**
 * Split filters by author
 */
export function splitFlatByWriteRelays(cache: RelayCache, input: Array<FlatReqFilter>): Array<RelayTaggedFlatFilters> {
  const authors = input.filter(a => a.authors).map(a => unwrap(a.authors));
  if (authors.length === 0) {
    return [
      {
        relay: "",
        filters: input,
      },
    ];
  }
  const topRelays = pickTopRelays(cache, authors, PickNRelays);
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

  debug("GOSSIP")("Picked %d relays from %d filters", picked.length, input.length);
  return picked;
}

/**
 * Pick most popular relays for each authors
 */
function pickTopRelays(cache: RelayCache, authors: Array<string>, n: number) {
  // map of pubkey -> [write relays]
  const allRelays = authors.map(a => {
    return {
      key: a,
      relays: cache
        .getFromCache(a)
        ?.relays?.filter(a => a.settings.write)
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
