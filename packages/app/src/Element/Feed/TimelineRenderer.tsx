import { useInView } from "react-intersection-observer";
import ProfileImage from "@/Element/User/ProfileImage";
import { FormattedMessage } from "react-intl";
import Icon from "@/Icons/Icon";
import { NostrLink, TaggedNostrEvent } from "@snort/system";
import { ReactNode, useState } from "react";
import { TimelineFragment } from "@/Element/Feed/TimelineFragment";
import { transformTextCached } from "@/Hooks/useTextTransformCache";
import useImgProxy from "@/Hooks/useImgProxy";
import { Link } from "react-router-dom";
import { DisplayAs } from "@/Element/Feed/DisplayAsSelector";
import { SpotlightThreadModal } from "@/Element/Spotlight/SpotlightThreadModal";

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
  const [modalThread, setModalThread] = useState<NostrLink | undefined>(undefined);

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

  const renderGrid = () => {
    // TODO Hide images from notes with a content warning, unless otherwise configured
    const noteImageRenderer = (e: TaggedNostrEvent) => {
      const parsed = transformTextCached(e.id, e.content, e.tags);
      const media = parsed.filter(
        a => a.type === "media" && (a.mimeType?.startsWith("image/") || a.mimeType?.startsWith("video/")),
      );

      if (media.length === 0) return null;

      const isVideo = media[0].mimeType?.startsWith("video/");
      const noteId = NostrLink.fromEvent(e).encode(CONFIG.eventLinkPrefix);

      const onClick = (clickEvent: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
        if (props.noteOnClick) {
          props.noteOnClick(e);
          clickEvent.preventDefault();
        } else if (window.innerWidth >= 768) {
          setModalThread(NostrLink.fromEvent(e));
          clickEvent.preventDefault();
        }
      };

      return (
        <Link to={`/${noteId}`} className="aspect-square cursor-pointer hover:opacity-80 relative" onClick={onClick}>
          <img src={proxy(media[0].content, 256)} alt="Note Media" className="w-full h-full object-cover" />
          {isVideo && (
            <Icon name="play-square-outline" className="absolute right-2 top-2 text-white opacity-80 drop-shadow-md" />
          )}
        </Link>
      );
    };

    const noteRenderer = props.noteRenderer || noteImageRenderer;

    return props.frags.map(frag => (
      <div className="grid grid-cols-3 gap-px md:gap-1">{frag.events.map(event => noteRenderer(event))}</div>
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
                return (
                  <ProfileImage
                    pubkey={p}
                    showProfileCard={false}
                    showUsername={false}
                    link={""}
                    showFollowDistance={false}
                  />
                );
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
      {modalThread && (
        <SpotlightThreadModal
          thread={modalThread}
          onClose={() => setModalThread(undefined)}
          onBack={() => setModalThread(undefined)}
        />
      )}
    </>
  );
}
