import { EventKind, NostrLink, RequestBuilder } from "@snort/system";
import { useEventsFeed, useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";

/**
 * Use a link event containing e/a/p/t tags
 */
export function useLinkList(id: string, fn: (rb: RequestBuilder) => void) {
  const sub = useMemo(() => {
    const rb = new RequestBuilder(id);
    fn(rb);
    return rb;
  }, [id, fn]);

  const listStore = useRequestBuilder(sub);
  return useMemo(() => {
    if (listStore && listStore.length > 0) {
      return listStore.map(e => NostrLink.fromTags(e.tags)).flat();
    }
    return [];
  }, [listStore]);
}

export function useLinkListEvents(id: string, fn: (rb: RequestBuilder) => void) {
  const links = useLinkList(id, fn);
  return useEventsFeed(`${id}:events`, links);
}

export function usePinList(pubkey: string | undefined) {
  return useLinkListEvents(`list:pins:${pubkey?.slice(0, 12)}`, rb => {
    if (pubkey) {
      rb.withFilter().kinds([EventKind.PinList]).authors([pubkey]);
    }
  });
}

export function useBookmarkList(pubkey: string | undefined) {
  return useLinkListEvents(`list:bookmark:${pubkey?.slice(0, 12)}`, rb => {
    if (pubkey) {
      rb.withFilter().kinds([EventKind.BookmarksList]).authors([pubkey]);
    }
  });
}

export function useInterestsList(pubkey: string | undefined) {
  return useLinkList(`list:interest:${pubkey?.slice(0, 12)}`, rb => {
    if (pubkey) {
      rb.withFilter().kinds([EventKind.InterestsList]).authors([pubkey]);
    }
  });
}
