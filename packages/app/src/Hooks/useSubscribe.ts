import { ReqFilter, RequestBuilder, TaggedNostrEvent } from "@snort/system";
import inMemoryDB from "@snort/system/src/InMemoryDB";
import { useRequestBuilder } from "@snort/system-react";
import { useEffect, useMemo, useState } from "react";

import { System } from "@/system";

export default function useSubscribe(id: string, filter: ReqFilter): TaggedNostrEvent[] {
  const getEvents = () => inMemoryDB.findArray(filter);
  const [events, setEvents] = useState(getEvents());
  const rb = useMemo(() => {
    const rb = new RequestBuilder(id);
    rb.withBareFilter(filter);
    return rb;
  }, [id, filter]);
  useRequestBuilder(rb);

  useEffect(() => {
    const cb = (subId: string) => {
      if (subId === id) {
        setEvents(getEvents());
      }
    };
    System.on("event", cb);
    return () => {
      System.off("event", cb);
    };
  }, [id, filter]);

  return events as Array<TaggedNostrEvent>;
}
