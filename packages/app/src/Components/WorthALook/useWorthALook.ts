import { EventKind, RequestBuilder } from "@snort/system"
import { useCached, useRequestBuilder } from "@snort/system-react"
import { useMemo } from "react"

import NostrBandApi from "@/External/NostrBand"
import useContentDiscovery from "@/Hooks/useContentDiscovery"
import useFollowsControls from "@/Hooks/useFollowControls"
import useLogin from "@/Hooks/useLogin"
import useModeration from "@/Hooks/useModeration"
import usePreferences from "@/Hooks/usePreferences"
import { Hour } from "@/Utils/Const"

import { HighlightKind, rankDiscovery, suggestPeople } from "./discovery"

const DefaultTrendingDvm = "0d9ec486275b70f0c4faec277fc4c63b9f14cb1ca1ec029f7d76210e957e5257"
export const MinFollowsForNetwork = 5

export function useNetworkDiscovery() {
  const { followList, pubkey } = useFollowsControls()
  const muted = useLogin(s => s.state.muted)
  const enabled = followList.length >= MinFollowsForNetwork

  const sub = useMemo(() => {
    const rb = new RequestBuilder("worth-a-look")
    if (enabled) {
      rb.withFilter()
        .authors(followList)
        .kinds([EventKind.TextNote, EventKind.Comment, EventKind.Repost, HighlightKind])
        .limit(300)
      rb.withFilter().kinds([EventKind.ZapReceipt]).tag("P", followList).limit(100)
    }
    return rb
  }, [enabled, followList])

  const events = useRequestBuilder(sub)

  return useMemo(() => {
    const mutedSet = new Set(muted.map(m => m.toEventTag()?.[1]))
    const items = rankDiscovery(events, followList, pubkey).filter(i => !i.author || !mutedSet.has(i.author))
    const people = suggestPeople(events, followList, pubkey).filter(p => !mutedSet.has(p.pubkey))
    return { enabled, items, people }
  }, [events, followList, pubkey, enabled, muted])
}

export function usePopularNotes() {
  const trendingDvmPubkey = usePreferences(p => p.trendingDvmPubkey)
  const { isEventMuted } = useModeration()
  const { data } = useContentDiscovery(trendingDvmPubkey || DefaultTrendingDvm)
  return useMemo(() => data.filter(e => e.kind !== 7000 && !isEventMuted(e)), [data, isEventMuted])
}

export function usePopularPeople() {
  const { data } = useCached(
    "nostr-band-trending-profiles",
    async () => await new NostrBandApi().trendingProfiles(),
    Hour * 2,
  )
  return data?.profiles.map(p => p.pubkey) ?? []
}
