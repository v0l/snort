import { useInView } from "react-intersection-observer";
import ProfileImage from "@/Element/User/ProfileImage";
import { FormattedMessage } from "react-intl";
import Icon from "@/Icons/Icon";
import { NostrLink, TaggedNostrEvent } from "@snort/system";
import { ReactNode } from "react";
import { TimelineFragment } from "@/Element/Feed/TimelineFragment";
import { transformTextCached } from "@/Hooks/useTextTransformCache";
import useImgProxy from "@/Hooks/useImgProxy";
import { useNavigate } from "react-router-dom";
import { DisplayAs } from "@/Element/Feed/DisplayAsSelector";

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
  displayAs?: DisplayAs;
}

export function TimelineRenderer(props: TimelineRendererProps) {
  const { ref, inView } = useInView();
  const { proxy } = useImgProxy();
  const navigate = useNavigate();

  const renderNotes = () => {
    return props.frags.map(frag => (
      <TimelineFragment
        frag={frag}
        related={props.related}
        noteRenderer={props.noteRenderer}
        noteOnClick={props.noteOnClick}
        noteContext={props.noteContext}
      />
    ));
  };

  const noteOnClick =
    props.noteOnClick ||
    ((ev: TaggedNostrEvent) => {
      navigate(NostrLink.fromEvent(ev).encode(CONFIG.eventLinkPrefix));
    });

  const renderGrid = () => {
    // TODO Hide images from notes with a content warning, unless otherwise configured
    const noteImageRenderer = (e: TaggedNostrEvent) => {
      const parsed = transformTextCached(e.id, e.content, e.tags);
      const images = parsed.filter(a => a.type === "media" && a.mimeType?.startsWith("image/"));
      if (images.length === 0) return null;

      return (
        <div
          className="aspect-square bg-center bg-cover cursor-pointer"
          key={e.id}
          style={{ backgroundImage: `url(${proxy(images[0].content, 256)})` }}
          onClick={() => noteOnClick(e)}></div>
      );
    };

    const noteRenderer = props.noteRenderer || noteImageRenderer;

    return props.frags.map(frag => (
      <div className="grid grid-cols-3 gap-px md:gap-1 p-0 md:p-1">{frag.events.map(event => noteRenderer(event))}</div>
    ));
  };

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
      {props.displayAs === "grid" ? renderGrid() : renderNotes()}
    </>
  );
}
