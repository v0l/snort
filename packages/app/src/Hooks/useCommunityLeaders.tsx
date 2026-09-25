import { unwrap } from "@snort/shared"
import { EventKind, NostrLink, parseNostrLink, RequestBuilder } from "@snort/system"
import { useRequestBuilder } from "@snort/system-react"
import { useEffect, useMemo, useSyncExternalStore } from "react"

import { LeadersStore } from "@/Cache/CommunityLeadersStore"

export function useCommunityLeaders() {
  const link =
    CONFIG.features.communityLeaders && CONFIG.communityLeaders
      ? parseNostrLink(unwrap(CONFIG.communityLeaders).list)
      : undefined

  const sub = useMemo(() => {
    const rb = new RequestBuilder("leaders")
    if (link) {
      rb.withFilter().kinds([EventKind.FollowSet]).link(link)
    }
    return rb
  }, [link?.encode()])
  const events = useRequestBuilder(sub)
  const list = useMemo(() => events.flatMap(e => NostrLink.fromTags(e.tags)), [events])

  useEffect(() => {
    LeadersStore.setLeaders(list.map(a => a.id))
  }, [list])
}

export function useCommunityLeader(pubkey?: string) {
  const store = useSyncExternalStore(
    c => LeadersStore.hook(c),
    () => LeadersStore.snapshot(),
  )

  return pubkey && store.includes(pubkey)
}
