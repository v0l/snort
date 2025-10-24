import { EventKind, NostrLink, RequestBuilder, RequestFilterBuilder, TaggedNostrEvent } from "@snort/system";
import { SnortContext, useEventReactions, useReactions } from "@snort/system-react";
import React, { useContext, useEffect, useMemo, useState } from "react";

import { FooterZapButton } from "@/Components/Event/Note/NoteFooter/FooterZapButton";
import { LikeButton } from "@/Components/Event/Note/NoteFooter/LikeButton";
import { PowIcon } from "@/Components/Event/Note/NoteFooter/PowIcon";
import { ReplyButton } from "@/Components/Event/Note/NoteFooter/ReplyButton";
import { RepostButton } from "@/Components/Event/Note/NoteFooter/RepostButton";
import ReactionsModal from "@/Components/Event/Note/ReactionsModal";
import useLogin from "@/Hooks/useLogin";
import useModeration from "@/Hooks/useModeration";
import usePreferences from "@/Hooks/usePreferences";
import classNames from "classnames";
import { WorkerRelayInterface } from "@snort/worker-relay";

export interface NoteFooterProps {
  replyCount?: number;
  ev: TaggedNostrEvent;
  className?: string;
}

export default function NoteFooter(props: NoteFooterProps) {
  const { ev } = props;
  const link = useMemo(() => NostrLink.fromEvent(ev), [ev.id]);
  const [showReactions, setShowReactions] = useState(false);
  const [replyCount, setReplyCount] = useState(props.replyCount);
  const { isMuted } = useModeration();

  const system = useContext(SnortContext);

  const related = useReactions("reactions", link);
  const { reactions, zaps, reposts } = useEventReactions(
    link,
    related.filter(a => !isMuted(a.pubkey)),
  );
  const { positive } = reactions;

  const readonly = useLogin(s => s.readonly);
  const enableReactions = usePreferences(s => s.enableReactions);
  useEffect(() => {
    const cacheRelay = system.cacheRelay;
    // try to count replies from cache relay when props doesnt provide the count
    // this normally is the case for timelines views
    // thread views are the only ones which have the true reply count
    if (cacheRelay instanceof WorkerRelayInterface && !props.replyCount) {
      const fx = new RequestFilterBuilder().kinds([EventKind.TextNote, EventKind.Comment]).replyToLink([link]);

      cacheRelay.count(["REQ", "", fx.filter]).then(setReplyCount);
    }
  }, [system, ev, props.replyCount]);

  return (
    <div className={classNames("flex flex-row gap-4 overflow-hidden max-w-full h-6 items-center", props.className)}>
      <ReplyButton ev={ev} replyCount={props.replyCount ?? replyCount} readonly={readonly} />
      <RepostButton ev={ev} reposts={reposts} />
      {enableReactions && <LikeButton ev={ev} positiveReactions={positive} />}
      {CONFIG.showPowIcon && <PowIcon ev={ev} />}
      <FooterZapButton ev={ev} zaps={zaps} onClickZappers={() => setShowReactions(true)} />
      {showReactions && <ReactionsModal initialTab={1} onClose={() => setShowReactions(false)} event={ev} />}
    </div>
  );
}
