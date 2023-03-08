import { HexKey } from "@snort/nostr";
import { useMemo } from "react";
import { FollowsRelays } from "State/Relays";
import { unwrap } from "Util";

export type RelayPicker = ReturnType<typeof useRelaysForFollows>;

/**
 * Number of relays to pick per pubkey
 */
const PickNRelays = 2;

export default function useRelaysForFollows(keys: Array<HexKey>) {
  return useMemo(() => {
    if (keys.length === 0) {
      return {};
    }

    const allRelays = keys.map(a => {
      return {
        key: a,
        relays: FollowsRelays.snapshot.get(a),
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
    }, new Map<string, Set<HexKey>>());
    const topRelays = [...relayUserMap.entries()].sort(([, v], [, v1]) => v1.size - v.size);

    // <relay, key[]> - count keys per relay
    // <key, relay[]> - pick n top relays
    // <relay, key[]> - map keys per relay (for subscription filter)

    const userPickedRelays = keys.map(k => {
      // pick top 3 relays for this key
      const relaysForKey = topRelays
        .filter(([, v]) => v.has(k))
        .slice(0, PickNRelays)
        .map(([k]) => k);
      return { k, relaysForKey };
    });

    const pickedRelays = new Set(userPickedRelays.map(a => a.relaysForKey).flat());

    const picked = Object.fromEntries(
      [...pickedRelays].map(a => {
        const keysOnPickedRelay = new Set(userPickedRelays.filter(b => b.relaysForKey.includes(a)).map(b => b.k));
        return [a, [...keysOnPickedRelay]];
      })
    );
    picked[""] = missing.map(a => a.key);
    console.debug(picked);
    return picked;
  }, [keys]);
}
