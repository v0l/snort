import { useInView } from "react-intersection-observer";
import ProfileImage from "@/Element/User/ProfileImage";
import { FormattedMessage } from "react-intl";
import Icon from "@/Icons/Icon";
import { NostrLink, TaggedNostrEvent } from "@snort/system";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { TimelineFragment } from "@/Element/Feed/TimelineFragment";
import { DisplayAs } from "@/Element/Feed/DisplayAsSelector";
import { SpotlightThreadModal } from "@/Element/Spotlight/SpotlightThreadModal";
import ImageGridItem from "@/Element/Feed/ImageGridItem";
import ErrorBoundary from "@/Element/ErrorBoundary";
import getEventMedia from "@/Element/Event/getEventMedia";

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

// filter frags[0].events that have media
function Grid({ frags }: { frags: Array<TimelineFragment> }) {
  const [modalThreadIndex, setModalThreadIndex] = useState<number | undefined>(undefined);
  const allEvents = useMemo(() => {
    return frags.flatMap(frag => frag.events);
  }, [frags]);
  const mediaEvents = useMemo(() => {
    return allEvents.filter(event => getEventMedia(event).length > 0);
  }, [allEvents]);

  const modalThread = modalThreadIndex !== undefined ? mediaEvents[modalThreadIndex] : undefined;

  return (
    <>
      <div className="grid grid-cols-3 gap-px md:gap-1">
        {mediaEvents.map((event, index) => (
          <ImageGridItem key={event.id} event={event} onClick={() => setModalThreadIndex(index)} />
        ))}
      </div>
      {modalThread && (
        <SpotlightThreadModal
          key={modalThreadIndex}
          thread={NostrLink.fromEvent(modalThread)}
          onClose={() => setModalThreadIndex(undefined)}
          onBack={() => setModalThreadIndex(undefined)}
          onNext={() => setModalThreadIndex(Math.min(modalThreadIndex + 1, mediaEvents.length - 1))}
          onPrev={() => setModalThreadIndex(Math.max(modalThreadIndex - 1, 0))}
        />
      )}
    </>
  );
}

export function TimelineRenderer(props: TimelineRendererProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const latestNotesFixedRef = useRef<HTMLDivElement | null>(null);
  const { ref, inView } = useInView();

  const updateLatestNotesPosition = () => {
    if (containerRef.current && latestNotesFixedRef.current) {
      const parentRect = containerRef.current.getBoundingClientRect();
      const childWidth = latestNotesFixedRef.current.offsetWidth;

      const leftPosition = parentRect.left + (parentRect.width - childWidth) / 2;
      latestNotesFixedRef.current.style.left = `${leftPosition}px`;
    }
  };

  useEffect(() => {
    updateLatestNotesPosition();
    window.addEventListener("resize", updateLatestNotesPosition);

    return () => {
      window.removeEventListener("resize", updateLatestNotesPosition);
    };
  }, [inView, props.latest]);

  const renderNotes = () => {
    return props.frags.map(frag => (
      <ErrorBoundary>
        <TimelineFragment
          frag={frag}
          related={props.related}
          noteRenderer={props.noteRenderer}
          noteOnClick={props.noteOnClick}
          noteContext={props.noteContext}
        />
      </ErrorBoundary>
    ));
  };

  return (
    <div ref={containerRef}>
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
              ref={latestNotesFixedRef}
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
      {props.displayAs === "grid" ? <Grid frags={props.frags} /> : renderNotes()}
    </div>
  );
}
