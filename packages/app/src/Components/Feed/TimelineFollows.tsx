import { unixNow } from "@snort/shared";
import { EventKind, NostrEvent, RequestBuilder } from "@snort/system";
import { ReactNode, useCallback } from "react";

import useFollowsControls from "@/Hooks/useFollowControls";
import useHistoryState from "@/Hooks/useHistoryState";
import useTimelineChunks from "@/Hooks/useTimelineChunks";
import { Hour } from "@/Utils/Const";

import { AutoLoadMore } from "../Event/LoadMore";
import TimelineChunk from "./TimelineChunk";

export interface TimelineFollowsProps {
  id?: string;
  postsOnly: boolean;
  noteFilter?: (ev: NostrEvent) => boolean;
  noteRenderer?: (ev: NostrEvent) => ReactNode;
  noteOnClick?: (ev: NostrEvent) => void;
  kinds?: Array<EventKind>;
  firstChunkSize?: number;
  windowSize?: number;
}

/**
 * A list of notes by your follows
 */
const TimelineFollows = (props: TimelineFollowsProps) => {
  const [openedAt] = useHistoryState(unixNow(), "openedAt");
  const { isFollowing, followList } = useFollowsControls();
  const { chunks, showMore } = useTimelineChunks({
    now: openedAt,
    window: props.windowSize,
    firstChunkSize: props.firstChunkSize ?? Hour * 2,
  });

  const builder = useCallback(
    (rb: RequestBuilder) => {
      rb.withFilter()
        .authors(followList)
        .kinds(props.kinds ?? [EventKind.TextNote, EventKind.Repost, EventKind.Polls]);
    },
    [followList],
  );

  const filterEvents = useCallback(
    (a: NostrEvent) =>
      (props.noteFilter?.(a) ?? true) &&
      (props.postsOnly ? !a.tags.some(b => b[0] === "e" || b[0] === "a") : true) &&
      (isFollowing(a.pubkey) || a.tags.filter(a => a[0] === "t").length < 5),
    [props.noteFilter, props.postsOnly, followList],
  );

  return (
    <>
      {chunks.map(c => (
        <TimelineChunk
          key={c.until}
          id={`follows${props.id ? `:${props.id}` : ""}`}
          chunk={c}
          builder={builder}
          noteFilter={filterEvents}
          noteOnClick={props.noteOnClick}
          noteRenderer={props.noteRenderer}
        />
      ))}
      <AutoLoadMore onClick={() => showMore()} />
    </>
  );
};

export default TimelineFollows;
