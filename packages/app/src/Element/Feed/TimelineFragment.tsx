import { TaggedNostrEvent } from "@snort/system";
import Note from "Element/Event/Note";
import ProfileImage from "Element/User/ProfileImage";
import Icon from "Icons/Icon";
import { findTag } from "SnortUtils";
import { ReactNode, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { FormattedMessage } from "react-intl";

export interface TimelineFragment {
  events: Array<TaggedNostrEvent>;
  refTime: number;
  title?: ReactNode;
}

export interface TimelineFragmentProps {
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

export function TimelineRenderer(props: TimelineFragmentProps) {
  const { ref, inView } = useInView();
  const relatedFeed = useCallback(
    (id: string) => {
      return props.related.filter(a => findTag(a, "e") === id);
    },
    [props.related],
  );

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
      {props.frags.map(f => {
        return (
          <>
            {f.title}
            {f.events.map(
              e =>
                props.noteRenderer?.(e) ?? (
                  <Note data={e} related={relatedFeed(e.id)} key={e.id} depth={0} onClick={props.noteOnClick} />
                ),
            )}
          </>
        );
      })}
    </>
  );
}
