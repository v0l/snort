import { unixNow } from "@snort/shared"
import { type EventKind, type NostrEvent, RequestBuilder } from "@snort/system"
import { useRequestBuilder } from "@snort/system-react"
import { type ReactNode, useCallback, useMemo } from "react"

import { isReply, TimelineKinds } from "@/Feed/TimelineFeed"
import useFollowsControls from "@/Hooks/useFollowControls"
import useHistoryState from "@/Hooks/useHistoryState"
import useTimelineChunks from "@/Hooks/useTimelineChunks"
import { dedupeByPubkey } from "@/Utils"
import { Hour } from "@/Utils/Const"

import { useLastRead } from "@/Hooks/useLastRead"
import { useNewNoteCount } from "@/Hooks/useNewNoteCount"

import { AutoLoadMore } from "../Event/LoadMore"
import { WelcomeBack } from "./LeftOff"
import TimelineChunk from "./TimelineChunk"
import { TimelineRenderer } from "./TimelineRenderer"

export interface TimelineFollowsProps {
  id?: string
  postsOnly: boolean
  noteFilter?: (ev: NostrEvent) => boolean
  noteRenderer?: (ev: NostrEvent) => ReactNode
  noteOnClick?: (ev: NostrEvent) => void
  kinds?: Array<EventKind>
  firstChunkSize?: number
  windowSize?: number
}

/**
 * A list of notes by your follows
 */
const TimelineFollows = (props: TimelineFollowsProps) => {
  const id = `follows${props.id ? `:${props.id}` : ""}`
  const [openedAt] = useHistoryState(unixNow(), "openedAt")
  // Events newer than this are buffered behind the "show latest" pill;
  // persisted in history state so back-navigation doesn't re-bury them.
  const [shownUntil, setShownUntil] = useHistoryState(openedAt, "latestShownUntil")
  const { isFollowing, followList } = useFollowsControls()
  const { leftOffAt } = useLastRead(id)
  const newNotes = useNewNoteCount(leftOffAt)
  const { chunks, showMore, loadUntil } = useTimelineChunks({
    now: openedAt,
    window: props.windowSize,
    firstChunkSize: props.firstChunkSize ?? Hour * 2,
  })

  const builder = useCallback(
    (rb: RequestBuilder) => {
      rb.withFilter()
        .authors(followList)
        .kinds(props.kinds ?? TimelineKinds)
    },
    [followList, props.kinds],
  )

  const filterEvents = useCallback(
    (a: NostrEvent) =>
      (props.noteFilter?.(a) ?? true) &&
      (props.postsOnly ? !isReply(a) : true) &&
      (isFollowing(a.pubkey) || a.tags.filter(a => a[0] === "t").length < 5),
    [props.noteFilter, props.postsOnly, isFollowing],
  )

  // Live edge: stream events published after the chunk anchor.
  // Chunks are inclusive up to openedAt, so start 1s past the boundary.
  const latestSub = useMemo(() => {
    const rb = new RequestBuilder(`timeline-latest:${id}`)
    rb.withOptions({ leaveOpen: true })
    rb.withFilter()
      .authors(followList)
      .kinds(props.kinds ?? TimelineKinds)
      .since(openedAt + 1)
      .limit(1)
    return rb
  }, [id, followList, props.kinds, openedAt])
  const latestFeed = useRequestBuilder(latestSub)

  const shownLatest = useMemo(
    () => latestFeed.filter(a => a.created_at <= shownUntil && filterEvents(a)),
    [latestFeed, shownUntil, filterEvents],
  )
  const pendingLatest = useMemo(
    () => latestFeed.filter(a => a.created_at > shownUntil && filterEvents(a)),
    [latestFeed, shownUntil, filterEvents],
  )
  const latestAuthors = useMemo(() => dedupeByPubkey(pendingLatest).map(e => e.pubkey), [pendingLatest])

  return (
    <>
      <WelcomeBack leftOffAt={leftOffAt} newNotes={newNotes} loadUntil={loadUntil} />
      <TimelineRenderer
        frags={{
          events: shownLatest,
          refTime: shownUntil,
        }}
        latest={latestAuthors}
        showLatest={toTop => {
          setShownUntil(unixNow())
          if (toTop) {
            window.scrollTo(0, 0)
          }
        }}
        noteOnClick={props.noteOnClick}
        noteRenderer={props.noteRenderer}
        leftOffAt={leftOffAt}
      />
      {chunks.map(c => (
        <TimelineChunk
          key={c.until}
          id={id}
          chunk={c}
          builder={builder}
          noteFilter={filterEvents}
          noteOnClick={props.noteOnClick}
          noteRenderer={props.noteRenderer}
          leftOffAt={leftOffAt}
        />
      ))}
      <AutoLoadMore onClick={() => showMore()} />
    </>
  )
}

export default TimelineFollows
