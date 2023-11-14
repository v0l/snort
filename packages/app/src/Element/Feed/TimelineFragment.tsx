import { ReactNode, useCallback } from "react";
import { FormattedMessage } from "react-intl";
import { useInView } from "react-intersection-observer";
import { TaggedNostrEvent } from "@snort/system";

import Note from "Element/Event/Note";
import ProfileImage from "Element/User/ProfileImage";
import Icon from "Icons/Icon";
import { findTag } from "SnortUtils";

export interface TimelineFragment {
  events: Array<TaggedNostrEvent>;
  refTime: number;
  title?: ReactNode;
}

export interface TimelineRendererProps {
  frags: Array<TimelineFragment>;
  related: Array<TaggedNostrEvent>;
  /**
   * List of pubkeys who have posted recently
   */
  latest: Array<string>;
  showLatest: (toTop: boolean) => void;
  noteRenderer?: (ev: TaggedNostrEvent) => ReactNode;
  noteOnClick?: (ev: TaggedNostrEvent) => void;
}

export function TimelineRenderer(props: TimelineRendererProps) {
  const { ref, inView } = useInView();

  return (
    <>
      {props.latest.length > 0 && (
        <>
          <div className="card latest-notes" onClick={() => props.showLatest(false)} ref={ref}>
            {props.latest.slice(0, 3).map(p => {
              return <ProfileImage pubkey={p} showUsername={false} link={""} showFollowingMark={false} />;
            })}
            <FormattedMessage
              defaultMessage="{n} new {n, plural, =1 {note} other {notes}}"
              values={{ n: props.latest.length }}
            />
            <Icon name="arrowUp" />
          </div>
          {!inView && (
            <div
              className="card latest-notes latest-notes-fixed pointer fade-in"
              onClick={() => props.showLatest(true)}>
              {props.latest.slice(0, 3).map(p => {
                return <ProfileImage pubkey={p} showUsername={false} link={""} showFollowingMark={false} />;
              })}
              <FormattedMessage
                defaultMessage="{n} new {n, plural, =1 {note} other {notes}}"
                values={{ n: props.latest.length }}
              />
              <Icon name="arrowUp" />
            </div>
          )}
        </>
      )}
      {props.frags.map(f => (
        <TimelineFragment
          frag={f}
          related={props.related}
          noteRenderer={props.noteRenderer}
          noteOnClick={props.noteOnClick}
        />
      ))}
    </>
  );
}

export interface TimelineFragProps {
  frag: TimelineFragment;
  related: Array<TaggedNostrEvent>;
  noteRenderer?: (ev: TaggedNostrEvent) => ReactNode;
  noteOnClick?: (ev: TaggedNostrEvent) => void;
}

export function TimelineFragment(props: TimelineFragProps) {
  const relatedFeed = useCallback(
    (id: string) => {
      return props.related.filter(a => findTag(a, "e") === id);
    },
    [props.related],
  );
  return (
    <>
      {props.frag.title}
      {props.frag.events.map(
        e =>
          props.noteRenderer?.(e) ?? (
            <Note
              data={e}
              related={relatedFeed(e.id)}
              key={e.id}
              depth={0}
              onClick={props.noteOnClick}
              context={e.context}
            />
          ),
      )}
    </>
  );
}
