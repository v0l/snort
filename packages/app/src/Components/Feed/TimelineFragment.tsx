import { TaggedNostrEvent } from "@snort/system";
import { ReactNode } from "react";

import Note from "@/Components/Event/EventComponent";

export interface TimelineFragment {
  events: Array<TaggedNostrEvent>;
  refTime: number;
  title?: ReactNode;
}

export interface TimelineFragProps {
  frag: TimelineFragment;
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
              waitUntilInView={props.index > 5}
            />
          ),
      )}
    </>
  );
}
