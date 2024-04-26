import { NostrEvent, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { ReactNode, useMemo } from "react";

import { WindowChunk } from "@/Hooks/useTimelineChunks";

import { DisplayAs } from "./DisplayAsSelector";
import { TimelineFragment } from "./TimelineFragment";

export interface TimelineChunkProps {
  id: string;
  chunk: WindowChunk;
  builder: (rb: RequestBuilder) => void;
  noteFilter?: (ev: NostrEvent) => boolean;
  noteRenderer?: (ev: NostrEvent) => ReactNode;
  noteOnClick?: (ev: NostrEvent) => void;
  displayAs?: DisplayAs;
  showDisplayAsSelector?: boolean;
}

/**
 * Simple chunk of a timeline using absoliute time ranges
 */
export default function TimelineChunk(props: TimelineChunkProps) {
  const sub = useMemo(() => {
    const rb = new RequestBuilder(`timeline-chunk:${props.id}:${props.chunk.since}-${props.chunk.until}`);
    props.builder(rb);
    for (const f of rb.filterBuilders) {
      f.since(props.chunk.since).until(props.chunk.until);
    }
    return rb;
  }, [props.id, props.chunk, props.builder]);

  const feed = useRequestBuilder(sub);

  return (
    <TimelineFragment
      frag={{
        events: feed.filter(a => props.noteFilter?.(a) ?? true),
        refTime: props.chunk.until,
      }}
      noteOnClick={props.noteOnClick}
      noteRenderer={props.noteRenderer}
    />
  );
}
