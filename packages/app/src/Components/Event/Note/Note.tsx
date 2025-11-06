import { EventKind, NostrLink, TaggedNostrEvent } from "@snort/system";
import { WorkerRelayInterface } from "@snort/worker-relay";
import classNames from "classnames";
import { useCallback, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { useNavigate } from "react-router-dom";

import { Relay } from "@/Cache";
import { NoteProvider } from "@/Components/Event/Note/NoteContext";
import useModeration from "@/Hooks/useModeration";

import { NoteProps, NotePropsOptions } from "../EventComponent";
import HiddenNote from "../HiddenNote";
import NoteAppHandler from "./NoteAppHandler";
import { NoteContent } from "./NoteContent";

const defaultOptions = {
  showHeader: true,
  showTime: true,
  showFooter: true,
  canUnpin: false,
  canUnbookmark: false,
  showContextMenu: true,
};

const canRenderAsTextNote = [
  EventKind.TextNote,
  EventKind.Polls,
  EventKind.Photo,
  EventKind.Video,
  EventKind.ShortVideo,
  EventKind.Comment,
];

export function Note(props: NoteProps) {
  const { data: ev, highlight, options: opt, ignoreModeration = false, waitUntilInView } = props;
  const { isEventMuted } = useModeration();
  const { ref, inView } = useInView({ triggerOnce: true });
  const { ref: setSeenAtRef, inView: setSeenAtInView } = useInView({ rootMargin: "0px", threshold: 1 });

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (setSeenAtInView && Relay instanceof WorkerRelayInterface) {
      const r = Relay as WorkerRelayInterface;
      timeout = setTimeout(() => {
        r.setEventMetadata(ev.id, { seen_at: Math.round(Date.now() / 1000) });
      }, 1000);
    }
    return () => clearTimeout(timeout);
  }, [setSeenAtInView, ev.id]);

  const optionsMerged = { ...defaultOptions, ...opt };
  const goToEvent = useGoToEvent(props, optionsMerged);

  if (!canRenderAsTextNote.includes(ev.kind)) {
    return <NoteAppHandler ev={ev} />;
  }

  function threadLines() {
    if (!props.options?.threadLines) return;
    const tl = props.options.threadLines;
    const topLine = tl.topLine ?? false;
    const bottomLine = tl.bottomLine ?? false;
    if (!topLine && !bottomLine) return;

    return (
      <div
        className={classNames(tl.inset, "absolute border-l z-1", {
          "top-0": topLine,
          "top-2": !topLine,
          "bottom-0": bottomLine,
          "h-4": !bottomLine,
        })}
      />
    );
  }

  const noteElement = (
    <NoteProvider ev={ev}>
      <div className="relative border-b">
        <div
          className={classNames("min-h-[110px] flex flex-col gap-4 px-3 py-2", {
            "outline-highlight outline-2": highlight,
            "hover:bg-neutral-950 light:hover:bg-neutral-50 cursor-pointer": !opt?.isRoot,
          })}
          onClick={e => goToEvent(e, ev)}
          ref={ref}>
          <NoteContent
            props={props}
            options={optionsMerged}
            goToEvent={goToEvent}
            setSeenAtRef={setSeenAtRef}
            waitUntilInView={waitUntilInView}
            inView={inView}
          />
        </div>
        {threadLines()}
      </div>
    </NoteProvider>
  );

  return !ignoreModeration && isEventMuted(ev) ? <HiddenNote>{noteElement}</HiddenNote> : noteElement;
}

function useGoToEvent(props: NoteProps, options: NotePropsOptions) {
  const navigate = useNavigate();
  return useCallback(
    (e: React.MouseEvent, eTarget: TaggedNostrEvent) => {
      if (options?.canClick === false) {
        return;
      }

      let target = e.target as HTMLElement | null;
      while (target) {
        if (
          target.tagName === "A" ||
          target.tagName === "BUTTON" ||
          target.classList.contains("reaction-pill") ||
          target.classList.contains("szh-menu-container")
        ) {
          return;
        }
        target = target.parentElement;
      }

      e.stopPropagation();

      // prevent navigation if selecting text
      const cellText = document.getSelection();
      if (cellText?.type === "Range") {
        return;
      }

      // custom onclick handler
      if (props.onClick) {
        props.onClick(eTarget);
        return;
      }

      // link to event
      const link = NostrLink.fromEvent(eTarget);
      if (e.metaKey) {
        window.open(`/${link.encode(CONFIG.eventLinkPrefix)}`, "_blank");
      } else {
        navigate(`/${link.encode(CONFIG.eventLinkPrefix)}`, { state: eTarget });
      }
    },
    [navigate, props, options],
  );
}
