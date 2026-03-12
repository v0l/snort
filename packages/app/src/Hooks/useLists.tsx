import { EventKind, NostrLink, RequestBuilder } from "@snort/system"
import { useEventsFeed, useRequestBuilder } from "@snort/system-react"
import { useMemo } from "react"

const PinListKinds = [EventKind.PinList]
const BookmarksListKinds = [EventKind.BookmarksList]
const InterestsListKinds = [EventKind.InterestsList]

/**
 * Use a link event containing e/a/p/t tags
 */
export function useLinkList(id: string, kinds: Array<EventKind>, pubkey: string | undefined) {
  const sub = useMemo(() => {
    const rb = new RequestBuilder(id)
    if (pubkey) {
      rb.withFilter().kinds(kinds).authors([pubkey])
    }
    return rb
  }, [id, kinds, pubkey])

  const listStore = useRequestBuilder(sub)
  return useMemo(() => {
    if (listStore && listStore.length > 0) {
      return listStore.flatMap(e => NostrLink.fromTags(e.tags))
    }
    return []
  }, [listStore])
}

export function useLinkListEvents(id: string, kinds: Array<EventKind>, pubkey: string | undefined) {
  const links = useLinkList(id, kinds, pubkey)
  return useEventsFeed(`${id}:events`, links)
}

export function usePinList(pubkey: string | undefined) {
  return useLinkListEvents(`list:pins:${pubkey?.slice(0, 12)}`, PinListKinds, pubkey)
}

export function useBookmarkList(pubkey: string | undefined) {
  return useLinkListEvents(`list:bookmark:${pubkey?.slice(0, 12)}`, BookmarksListKinds, pubkey)
}

export function useInterestsList(pubkey: string | undefined) {
  return useLinkList(`list:interest:${pubkey?.slice(0, 12)}`, InterestsListKinds, pubkey)
}
