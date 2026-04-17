import {
  type EventKind,
  mapEventToProfile,
  type NostrEvent,
  NostrLink,
  RequestBuilder,
  type TaggedNostrEvent,
  type UserMetadata,
} from "@snort/system"
import { useRequestBuilder } from "@snort/system-react"
import { useMemo } from "react"
import useWoT from "./useWoT"

export interface AppHandler {
  event: TaggedNostrEvent
  metadata?: UserMetadata
  reccomendations: Array<NostrEvent>
}

export default function useAppHandler(kind: EventKind | undefined): Array<AppHandler> {
  const wot = useWoT()

  const sub = useMemo(() => {
    if (!kind) return new RequestBuilder("empty")
    const sub = new RequestBuilder(`app-handler:${kind}`)
    sub
      .withFilter()
      .kinds([31990 as EventKind])
      .tag("k", [kind.toString()])
    return sub
  }, [kind])

  const dataApps = useRequestBuilder(sub)

  const reccomendsSub = useMemo(() => {
    if (!kind || dataApps.length === 0) return new RequestBuilder("empty-reccomends")
    const reccomendsSub = new RequestBuilder(`app-handler:${kind}:reccomends`)
    reccomendsSub
      .withFilter()
      .kinds([31989 as EventKind])
      .replyToLink(dataApps.map(a => NostrLink.fromEvent(a)))
    return reccomendsSub
  }, [kind, dataApps.length, dataApps.map])

  const dataRecommends = useRequestBuilder(reccomendsSub)

  const apps = useMemo(() => {
    if (!kind) return []
    return dataApps.map(a => {
      const meta = a.content.startsWith("{") && a.content.endsWith("}") ? mapEventToProfile(a) : undefined
      const link = NostrLink.fromEvent(a)
      return {
        event: a,
        metadata: meta,
        reccomendations: wot.sortEvents(dataRecommends.filter(a => link.isReplyToThis(a))),
      } as AppHandler
    })
  }, [wot, dataApps.map, dataRecommends.filter, kind])

  return apps.sort((a, b) => (a.reccomendations.length > b.reccomendations.length ? -1 : 1))
}
