import { NostrLink, NoteCollection, ReqFilter, RequestBuilder } from "@snort/system";
import { useReactions, useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";

import { TimelineRenderer } from "@/Element/Feed/TimelineRenderer";

export function GenericFeed({ link }: { link: NostrLink }) {
  const sub = useMemo(() => {
    console.debug(link);
    const sub = new RequestBuilder("generic");
    sub.withOptions({ leaveOpen: true });
    const reqs = JSON.parse(link.id) as Array<ReqFilter>;
    reqs.forEach(a => {
      const f = sub.withBareFilter(a);
      link.relays?.forEach(r => f.relay(r));
    });
    return sub;
  }, [link]);

  const evs = useRequestBuilder(NoteCollection, sub);
  const reactions = useReactions("generic:reactions", evs.data?.map(a => NostrLink.fromEvent(a)) ?? []);

  return (
    <TimelineRenderer
      frags={[{ events: evs.data ?? [], refTime: 0 }]}
      related={reactions.data ?? []}
      latest={[]}
      showLatest={() => {
        //nothing
      }}
    />
  );
}
