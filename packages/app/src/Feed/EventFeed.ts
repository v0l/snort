import { useMemo } from "react";
import { NostrPrefix, RequestBuilder, ReplaceableNoteStore, NostrLink, NoteCollection } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";

import { unwrap } from "SnortUtils";

export function useEventFeed(link: NostrLink) {
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

export function useEventsFeed(id: string, links: Array<NostrLink>) {
  const sub = useMemo(() => {
    const b = new RequestBuilder(`events:${id}`);
    for(const l of links) {
      if (l.type === NostrPrefix.Address) {
        const f = b.withFilter().tag("d", [l.id]);
        if (l.author) {
          f.authors([unwrap(l.author)]);
        }
        if (l.kind) {
          f.kinds([unwrap(l.kind)]);
        }
      } else {
        const f = b.withFilter().ids([l.id]);
        if (l.relays) {
          l.relays.slice(0, 2).forEach(r => f.relay(r));
        }
        if (l.author) {
          f.authors([l.author]);
        }
      }
    }
    return b;
  }, [id, links]);

  return useRequestBuilder(NoteCollection, sub);
}
