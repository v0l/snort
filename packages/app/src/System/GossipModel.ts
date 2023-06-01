import { FullRelaySettings, ReqFilter } from "System";
import { unwrap } from "SnortUtils";
import debug from "debug";

const PickNRelays = 2;

export interface RelayTaggedFilter {
  relay: string;
  filter: ReqFilter;
}

export interface RelayTaggedFilters {
  relay: string;
  filters: Array<ReqFilter>;
}

export interface RelayCache {
  get(pubkey?: string): Array<FullRelaySettings> | undefined;
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
 * @param filter
 * @returns
 */
export function splitByWriteRelays(cache: RelayCache, filter: ReqFilter): Array<RelayTaggedFilter> {
  if ((filter.authors?.length ?? 0) === 0)
    return [
      {
        relay: "",
        filter,
      },
    ];

  const allRelays = unwrap(filter.authors).map(a => {
    return {
      key: a,
      relays: cache.get(a)?.filter(a => a.settings.write),
    };
  });

  const missing = allRelays.filter(a => a.relays === undefined);
  const hasRelays = allRelays.filter(a => a.relays !== undefined);
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

  const userPickedRelays = unwrap(filter.authors).map(k => {
    // pick top 3 relays for this key
    const relaysForKey = topRelays
      .filter(([, v]) => v.has(k))
      .slice(0, PickNRelays)
      .map(([k]) => k);
    return { k, relaysForKey };
  });

  const pickedRelays = new Set(userPickedRelays.map(a => a.relaysForKey).flat());

  const picked = [...pickedRelays].map(a => {
    const keysOnPickedRelay = new Set(userPickedRelays.filter(b => b.relaysForKey.includes(a)).map(b => b.k));
    return {
      relay: a,
      filter: {
        ...filter,
        authors: [...keysOnPickedRelay],
      },
    } as RelayTaggedFilter;
  });
  if (missing.length > 0) {
    picked.push({
      relay: "",
      filter: {
        ...filter,
        authors: missing.map(a => a.key),
      },
    });
  }
  debug("GOSSIP")("Picked %o", picked);
  return picked;
}
