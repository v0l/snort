import { useMemo } from "react";
import { NostrPrefix } from "@snort/nostr";

import useRequestBuilder from "Hooks/useRequestBuilder";
import { RequestBuilder, ReplaceableNoteStore } from "System";
import { NostrLink, unwrap } from "Util";

export default function useEventFeed(link: NostrLink) {
  const sub = useMemo(() => {
    const b = new RequestBuilder(`event:${link.id.slice(0, 12)}`);
    if (link.type === NostrPrefix.Address) {
      const f = b.withFilter().tag("d", [link.id]);
      if (link.author) {
        f.authors([unwrap(link.author)]);
      }
      if (link.kind) {
        f.kinds([unwrap(link.kind)]);
      }
    } else {
      b.withFilter().id(link.id, link.relays?.at(0));
    }
    return b;
  }, [link]);

  return useRequestBuilder<ReplaceableNoteStore>(ReplaceableNoteStore, sub);
}
