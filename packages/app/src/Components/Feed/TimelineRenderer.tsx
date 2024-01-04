import { TaggedNostrEvent } from "@snort/system";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import { FormattedMessage } from "react-intl";

import ErrorBoundary from "@/Components/ErrorBoundary";
import getEventMedia from "@/Components/Event/getEventMedia";
import { DisplayAs } from "@/Components/Feed/DisplayAsSelector";
import ImageGridItem from "@/Components/Feed/ImageGridItem";
import { TimelineFragment } from "@/Components/Feed/TimelineFragment";
import Icon from "@/Components/Icons/Icon";
import { SpotlightThreadModal } from "@/Components/Spotlight/SpotlightThreadModal";
import ProfileImage from "@/Components/User/ProfileImage";

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
  const [modalEventIndex, setModalEventIndex] = useState<number | undefined>(undefined);
  const allEvents = useMemo(() => {
    return frags.flatMap(frag => frag.events);
  }, [frags]);
  const mediaEvents = useMemo(() => {
    return allEvents.filter(event => getEventMedia(event).length > 0);
  }, [allEvents]);

  const modalEvent = modalEventIndex !== undefined ? mediaEvents[modalEventIndex] : undefined;
  const nextModalEvent = modalEventIndex !== undefined ? mediaEvents[modalEventIndex + 1] : undefined;
  const prevModalEvent = modalEventIndex !== undefined ? mediaEvents[modalEventIndex - 1] : undefined;

  return (
    <>
      <div className="grid grid-cols-3 gap-px md:gap-1">
        {mediaEvents.map((event, index) => (
          <ImageGridItem key={event.id} event={event} onClick={() => setModalEventIndex(index)} />
        ))}
      </div>
      {modalEvent && (
        <SpotlightThreadModal
          key={modalEvent.id}
          event={modalEvent}
          onClose={() => setModalEventIndex(undefined)}
          onBack={() => setModalEventIndex(undefined)}
          onNext={() => setModalEventIndex(Math.min((modalEventIndex ?? 0) + 1, mediaEvents.length - 1))}
          onPrev={() => setModalEventIndex(Math.max((modalEventIndex ?? 0) - 1, 0))}
        />
      )}
      {nextModalEvent && ( // preload next
        <SpotlightThreadModal className="hidden" key={`${nextModalEvent.id}-next`} event={nextModalEvent} />
      )}
      {prevModalEvent && ( // preload previous
        <SpotlightThreadModal className="hidden" key={`${prevModalEvent.id}-prev`} event={prevModalEvent} />
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
    return props.frags.map((frag, index) => (
      <ErrorBoundary key={frag.events[0]?.id + index}>
        <TimelineFragment
          frag={frag}
          related={props.related}
          noteRenderer={props.noteRenderer}
          noteOnClick={props.noteOnClick}
          noteContext={props.noteContext}
          index={index}
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
              return <ProfileImage key={p} pubkey={p} showUsername={false} link={""} showFollowDistance={false} />;
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
                    key={p}
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
