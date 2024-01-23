import { EventKind, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";

//import { LRUCache } from "typescript-lru-cache";
import useLogin from "@/Hooks/useLogin";

//const cache = new LRUCache<string, NostrEvent[]>({ maxSize: 100 });

export function useFollowsTimelineView(limit = 20) {
  const follows = useLogin(s => s.follows.item);
  const kinds = [EventKind.TextNote, EventKind.Repost, EventKind.Polls];

  const req = useMemo(() => {
    const rb = new RequestBuilder("follows-timeline");
    rb.withOptions({
      leaveOpen: true,
    });
    rb.withFilter().kinds(kinds).authors(follows).limit(limit);
    return rb;
  }, [follows, limit]);
  return useRequestBuilder(req);
}

export function useNotificationsView() {
  const publicKey = useLogin(s => s.publicKey);
  const kinds = [EventKind.TextNote, EventKind.Reaction, EventKind.Repost, EventKind.ZapReceipt];
  const req = useMemo(() => {
    if (publicKey) {
      const rb = new RequestBuilder("notifications");
      rb.withOptions({
        leaveOpen: true,
      });
      rb.withFilter().kinds(kinds).tag("p", [publicKey]).limit(1000);
      return rb;
    }
  }, [publicKey]);
  return useRequestBuilder(req);
}
