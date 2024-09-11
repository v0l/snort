import { unixNow } from "@snort/shared";
import { EventKind, NostrEvent, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import Geohash from "latlon-geohash";
import { useMemo } from "react";

import { calculateDistance, findTag, getCountry } from "@/Utils";
import { Day, MonitorRelays } from "@/Utils/Const";

interface RelayDistance {
  distance: number;
  event: NostrEvent;
  addr: string;
}

export function useCloseRelays() {
  const country = getCountry();

  const sub = useMemo(() => {
    const geoHash = Geohash.encode(country.lat, country.lon);
    const geoHashes = [];
    for (let x = 2; x < geoHash.length; x++) {
      geoHashes.push(geoHash.substring(0, x));
    }
    const rb = new RequestBuilder(`close-relays:${country}`);
    rb.withFilter()
      .kinds([30_166 as EventKind])
      .tag("g", geoHashes)
      .since(unixNow() - Day)
      .relay(MonitorRelays);
    return rb;
  }, [country]);

  const data = useRequestBuilder(sub);

  const distRelays = data
    .map(a => {
      const lowestDistance = a.tags
        .filter(a => a[0] === "g" && a[1].length > 5)
        .map(a => {
          const g = Geohash.decode(a[1]);
          return calculateDistance(g.lat, g.lon, country.lat, country.lon);
        })
        .reduce((acc, v) => (v < acc ? v : acc), Number.MAX_VALUE);
      return {
        distance: lowestDistance,
        event: a,
        addr: findTag(a, "d") ?? "",
      } as RelayDistance;
    })
    .sort((a, b) => (b.distance < a.distance ? 1 : -1))
    .reduce((acc, v) => {
      const u = new URL(v.addr);
      if (!acc.has(u.hostname)) {
        acc.set(u.hostname, {
          ...v,
          addr: `${u.protocol}//${u.host}/`,
        });
      }
      if (acc.get(u.hostname)!.distance > v.distance) {
        acc.set(u.hostname, v);
      }
      return acc;
    }, new Map<string, RelayDistance>());

  return [...distRelays.values()];
}
