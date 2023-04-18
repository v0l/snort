import { useMemo } from "react";

import useRequestBuilder from "Hooks/useRequestBuilder";
import { RequestBuilder, ReplaceableNoteStore } from "System";
import { NostrLink } from "Util";

export default function useEventFeed(link: NostrLink) {
  const sub = useMemo(() => {
    const b = new RequestBuilder(`event:${link.id.slice(0, 12)}`);
    b.withFilter().id(link.id, link.relays?.at(0));
    return b;
  }, [link]);

  return useRequestBuilder<ReplaceableNoteStore>(ReplaceableNoteStore, sub);
}
