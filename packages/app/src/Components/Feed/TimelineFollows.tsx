import { unixNow } from "@snort/shared";
import { EventKind, NostrEvent, RequestBuilder } from "@snort/system";
import { ReactNode, useCallback, useState } from "react";

import { DisplayAs, DisplayAsSelector } from "@/Components/Feed/DisplayAsSelector";
import useFollowsControls from "@/Hooks/useFollowControls";
import useHistoryState from "@/Hooks/useHistoryState";
import useLogin from "@/Hooks/useLogin";
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
  displayAs?: DisplayAs;
  kinds?: Array<EventKind>;
  showDisplayAsSelector?: boolean;
  firstChunkSize?: number;
  windowSize?: number;
}

/**
 * A list of notes by your follows
 */
const TimelineFollows = (props: TimelineFollowsProps) => {
  const login = useLogin(s => ({
    publicKey: s.publicKey,
    feedDisplayAs: s.feedDisplayAs,
    tags: s.state.getList(EventKind.InterestSet),
  }));
  const displayAsInitial = props.displayAs ?? login.feedDisplayAs ?? "list";
  const [displayAs, setDisplayAs] = useState<DisplayAs>(displayAsInitial);
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
      {(props.showDisplayAsSelector ?? true) && (
        <DisplayAsSelector activeSelection={displayAs} onSelect={(displayAs: DisplayAs) => setDisplayAs(displayAs)} />
      )}
      {chunks.map(c => (
        <TimelineChunk
          key={c.until}
          id={`follows${props.id ? `:${props.id}` : ""}`}
          chunk={c}
          builder={builder}
          noteFilter={filterEvents}
          noteOnClick={props.noteOnClick}
          noteRenderer={props.noteRenderer}
          displayAs={displayAs}
        />
      ))}
      <AutoLoadMore onClick={() => showMore()} />
    </>
  );
};

export default TimelineFollows;
