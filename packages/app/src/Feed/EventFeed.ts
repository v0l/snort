import { useMemo } from "react";
import { NostrPrefix, RequestBuilder, ReplaceableNoteStore, NostrLink } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";

import { unwrap } from "SnortUtils";

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
      const f = b.withFilter().ids([link.id]);
      if (link.relays) {
        link.relays.slice(0, 2).forEach(r => f.relay(r));
      }
      if (link.author) {
        f.authors([link.author]);
      }
    }
    return b;
  }, [link]);

  return useRequestBuilder(ReplaceableNoteStore, sub);
}
