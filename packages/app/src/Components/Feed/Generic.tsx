import { dedupe, removeUndefined } from "@snort/shared";
import { NostrLink, ReqFilter, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import Geohash from "latlon-geohash";
import { lazy, Suspense, useMemo } from "react";

import { TimelineRenderer } from "@/Components/Feed/TimelineRenderer";
import { findTag } from "@/Utils";
const LazySimpleChart = lazy(async () => await import("@/Components/LineChart"));
const LazyMap = lazy(async () => await import("@/Components/HereMap"));

export function GenericFeed({ link }: { link: NostrLink }) {
  const reqs = JSON.parse(link.id) as Array<ReqFilter>;
  const sub = useMemo(() => {
    const sub = new RequestBuilder("generic");
    sub.withOptions({ leaveOpen: true });
    reqs.forEach(a => {
      const f = sub.withBareFilter(a);
      link.relays?.forEach(r => f.relay(r));
    });
    return sub;
  }, [link]);

  const evs = useRequestBuilder(sub);

  const geoTags = dedupe(removeUndefined(evs.map(a => findTag(a, "g"))));
  const isTempSensor = reqs[0].kinds?.includes(8001) && reqs[0].kinds.length === 1;
  if (isTempSensor) {
    return (
      <div className="p flex flex-col gap-2">
        {geoTags.length > 0 && (
          <Suspense>
            <LazyMap
              zoom={2}
              center={{ lat: 30, lng: 0 }}
              markers={geoTags.map(a => {
                const pos = Geohash.decode(a);
                return {
                  lat: pos.lat,
                  lng: pos.lon,
                };
              })}
            />
          </Suspense>
        )}
        <Suspense>
          <LazySimpleChart
            data={evs
              .sort((a, b) => (a.created_at > b.created_at ? -1 : 1))
              .map(a => {
                return {
                  time: a.created_at * 1000,
                  ...JSON.parse(a.content),
                };
              })}
          />
        </Suspense>
      </div>
    );
  }
  return (
    <>
      <TimelineRenderer
        frags={[{ events: evs, refTime: 0 }]}
        latest={[]}
        showLatest={() => {
          //nothing
        }}
      />
    </>
  );
}
