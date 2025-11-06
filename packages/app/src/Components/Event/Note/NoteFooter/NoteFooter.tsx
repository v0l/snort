import { EventKind, RequestFilterBuilder } from "@snort/system";
import { SnortContext } from "@snort/system-react";
import { useContext, useEffect, useState } from "react";

import { FooterZapButton } from "@/Components/Event/Note/NoteFooter/FooterZapButton";
import { LikeButton } from "@/Components/Event/Note/NoteFooter/LikeButton";
import { PowIcon } from "@/Components/Event/Note/NoteFooter/PowIcon";
import { ReplyButton } from "@/Components/Event/Note/NoteFooter/ReplyButton";
import { RepostButton } from "@/Components/Event/Note/NoteFooter/RepostButton";
import { useNoteContext } from "@/Components/Event/Note/NoteContext";
import useLogin from "@/Hooks/useLogin";
import usePreferences from "@/Hooks/usePreferences";
import classNames from "classnames";
import { WorkerRelayInterface } from "@snort/worker-relay";

export interface NoteFooterProps {
  replyCount?: number;
  className?: string;
}

export default function NoteFooter(props: NoteFooterProps) {
  const { ev, link, reactions, setShowReactionsModal } = useNoteContext();
  const [replyCount, setReplyCount] = useState(props.replyCount);

  const system = useContext(SnortContext);

  const { reactions: reactionGroups, zaps, reposts } = reactions;
  const { positive } = reactionGroups;

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
      <FooterZapButton ev={ev} zaps={zaps} onClickZappers={() => setShowReactionsModal(true)} />
    </div>
  );
}
