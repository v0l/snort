import { TaggedNostrEvent } from "@snort/system";
import { ReactNode, useCallback } from "react";

import Note from "@/Components/Event/Note";
import { findTag } from "@/Utils";

export interface TimelineFragment {
  events: Array<TaggedNostrEvent>;
  refTime: number;
  title?: ReactNode;
}

export interface TimelineFragProps {
  frag: TimelineFragment;
  related: Array<TaggedNostrEvent>;
  index: number;
  noteRenderer?: (ev: TaggedNostrEvent) => ReactNode;
  noteOnClick?: (ev: TaggedNostrEvent) => void;
  noteContext?: (ev: TaggedNostrEvent) => ReactNode;
}

const options = {
  truncate: true,
};

export function TimelineFragment(props: TimelineFragProps) {
  return (
    <>
      {props.frag.title}
      {props.frag.events.map(
        e =>
          props.noteRenderer?.(e) ?? (
            <Note
              data={e}
              key={e.id}
              depth={0}
              onClick={props.noteOnClick}
              context={props.noteContext?.(e)}
              options={options}
              waitUntilInView={props.index > 10}
            />
          ),
      )}
    </>
  );
}
