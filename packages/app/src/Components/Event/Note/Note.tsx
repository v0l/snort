import { EventKind, NostrLink, TaggedNostrEvent } from "@snort/system";
import classNames from "classnames";
import React, { useState } from "react";
import { useInView } from "react-intersection-observer";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";

import NoteHeader from "@/Components/Event/Note/NoteHeader";
import { NoteText } from "@/Components/Event/Note/NoteText";
import useModeration from "@/Hooks/useModeration";
import { chainKey } from "@/Hooks/useThreadContext";
import { findTag } from "@/Utils";

import messages from "../../messages";
import Text from "../../Text/Text";
import { NoteProps } from "../EventComponent";
import HiddenNote from "../HiddenNote";
import Poll from "../Poll";
import { NoteTranslation } from "./NoteContextMenu";
import NoteFooter from "./NoteFooter";

export function Note(props: NoteProps) {
  const { data: ev, highlight, options: opt, ignoreModeration = false, className, waitUntilInView } = props;

  const baseClassName = classNames("note min-h-[110px] flex flex-col gap-4 card", className);
  const navigate = useNavigate();

  const { isEventMuted } = useModeration();
  const { ref, inView } = useInView({ triggerOnce: true, rootMargin: "2000px" });
  const [showTranslation, setShowTranslation] = useState(true);
  const [translated, setTranslated] = useState<NoteTranslation>();

  const options = {
    showHeader: true,
    showTime: true,
    showFooter: true,
    canUnpin: false,
    canUnbookmark: false,
    showContextMenu: true,
    ...opt,
  };

  function goToEvent(e: React.MouseEvent, eTarget: TaggedNostrEvent) {
    if (opt?.canClick === false) {
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
        return; // is there a better way to do this?
      }
      target = target.parentElement;
    }

    e.stopPropagation();
    if (props.onClick) {
      props.onClick(eTarget);
      return;
    }

    const link = NostrLink.fromEvent(eTarget);
    // detect cmd key and open in new tab
    if (e.metaKey) {
      window.open(`/${link.encode(CONFIG.eventLinkPrefix)}`, "_blank");
    } else {
      navigate(`/${link.encode(CONFIG.eventLinkPrefix)}`, {
        state: eTarget,
      });
    }
  }

  const canRenderAsTextNote = [EventKind.TextNote, EventKind.Polls];
  if (!canRenderAsTextNote.includes(ev.kind)) {
    const alt = findTag(ev, "alt");
    if (alt) {
      return (
        <div className="note-quote">
          <Text id={ev.id} content={alt} tags={[]} creator={ev.pubkey} />
        </div>
      );
    } else {
      return (
        <>
          <h4>
            <FormattedMessage {...messages.UnknownEventKind} values={{ kind: ev.kind }} />
          </h4>
          <pre>{JSON.stringify(ev, undefined, "  ")}</pre>
        </>
      );
    }
  }

  function translation() {
    if (translated && translated.confidence > 0.5) {
      return (
        <>
          <span
            className="text-xs font-semibold text-gray-light select-none"
            onClick={e => {
              e.stopPropagation();
              setShowTranslation(s => !s);
            }}>
            <FormattedMessage {...messages.TranslatedFrom} values={{ lang: translated.fromLanguage }} />
          </span>
        </>
      );
    } else if (translated) {
      return (
        <p className="text-xs font-semibold text-gray-light">
          <FormattedMessage {...messages.TranslationFailed} />
        </p>
      );
    }
  }

  function pollOptions() {
    if (ev.kind !== EventKind.Polls) return;

    return <Poll ev={ev} />;
  }

  function content() {
    if (waitUntilInView && !inView) return undefined;
    return (
      <>
        {options.showHeader && <NoteHeader ev={ev} options={options} setTranslated={setTranslated} />}
        <div className="body" onClick={e => goToEvent(e, ev, true)}>
          <NoteText {...props} translated={translated} showTranslation={showTranslation} />
          {translation()}
          {pollOptions()}
        </div>
        {options.showFooter && <NoteFooter ev={ev} replies={props.threadChains?.get(chainKey(ev))?.length} />}
      </>
    );
  }

  const note = (
    <div
      className={classNames(baseClassName, {
        active: highlight,
        "hover:bg-nearly-bg-color cursor-pointer": !opt?.isRoot,
      })}
      onClick={e => goToEvent(e, ev)}
      ref={ref}>
      {content()}
    </div>
  );

  return !ignoreModeration && isEventMuted(ev) ? <HiddenNote>{note}</HiddenNote> : note;
}
