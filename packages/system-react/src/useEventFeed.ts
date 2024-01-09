import { useMemo } from "react";
import { RequestBuilder, NostrLink } from "@snort/system";
import { useRequestBuilder } from "./useRequestBuilder";

export function useEventFeed(link: NostrLink) {
  const sub = useMemo(() => {
    const b = new RequestBuilder(`event:${link.id.slice(0, 12)}`);
    b.withFilter().link(link);
    return b;
  }, [link]);

  return useRequestBuilder(sub);
}

export function useEventsFeed(id: string, links: Array<NostrLink>) {
  const sub = useMemo(() => {
    const b = new RequestBuilder(`events:${id}`);
    links.forEach(v => b.withFilter().link(v));
    return b;
  }, [id, links]);

  return useRequestBuilder(sub);
}
