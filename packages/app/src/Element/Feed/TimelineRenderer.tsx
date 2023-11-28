import { useInView } from "react-intersection-observer";
import ProfileImage from "@/Element/User/ProfileImage";
import { FormattedMessage } from "react-intl";
import Icon from "@/Icons/Icon";
import { TaggedNostrEvent } from "@snort/system";
import { ReactNode } from "react";
import { TimelineFragment } from "@/Element/Feed/TimelineFragment";

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
  noteContext?: (ev: TaggedNostrEvent) => ReactNode;
}

export function TimelineRenderer(props: TimelineRendererProps) {
  const { ref, inView } = useInView();

  return (
    <>
      {props.latest.length > 0 && (
        <>
          <div className="card latest-notes" onClick={() => props.showLatest(false)} ref={ref}>
            {props.latest.slice(0, 3).map(p => {
              return <ProfileImage pubkey={p} showUsername={false} link={""} showFollowDistance={false} />;
            })}
            <FormattedMessage
              defaultMessage="{n} new {n, plural, =1 {note} other {notes}}"
              id="3t3kok"
              values={{ n: props.latest.length }}
            />
            <Icon name="arrowUp" />
          </div>
          {!inView && (
            <div
              className="card latest-notes latest-notes-fixed pointer fade-in"
              onClick={() => props.showLatest(true)}>
              {props.latest.slice(0, 3).map(p => {
                return <ProfileImage pubkey={p} showUsername={false} link={""} showFollowDistance={false} />;
              })}
              <FormattedMessage
                defaultMessage="{n} new {n, plural, =1 {note} other {notes}}"
                id="3t3kok"
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
          noteContext={props.noteContext}
        />
      ))}
    </>
  );
}
