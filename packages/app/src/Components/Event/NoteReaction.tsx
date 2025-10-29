import { EventKind, NostrLink, TaggedNostrEvent } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import { useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { FormattedMessage } from "react-intl";

import Icon from "@/Components/Icons/Icon";
import useModeration from "@/Hooks/useModeration";
import { getDisplayName } from "@/Utils";

import { NostrPrefix } from "@snort/shared";
import NoteQuote from "./Note/NoteQuote";

export interface NoteReactionProps {
  data: TaggedNostrEvent;
  root?: TaggedNostrEvent;
  depth?: number;
}
export default function NoteReaction(props: NoteReactionProps) {
  const { data: ev } = props;
  const { isMuted } = useModeration();
  const { inView, ref } = useInView({ triggerOnce: true, rootMargin: "2000px" });
  const profile = useUserProfile(inView ? ev.pubkey : "");

  const opt = useMemo(
    () => ({
      showHeader: ev?.kind === EventKind.Repost || ev?.kind === EventKind.TextNote,
      showFooter: false,
      truncate: true,
    }),
    [ev],
  );
  const links = NostrLink.fromTags(ev.tags);
  const refEvent = links.find(a => [NostrPrefix.Event, NostrPrefix.Note, NostrPrefix.Address].includes(a.type));
  const isOpMuted = refEvent?.author && isMuted(refEvent.author);
  if (isOpMuted) {
    return;
  }

  function action() {
    switch (ev.kind) {
      case EventKind.Repost: {
        return (
          <>
            <Icon name="repeat" size={18} />
            <FormattedMessage
              defaultMessage="{name} reposted"
              values={{
                name: getDisplayName(profile, ev.pubkey),
              }}
            />
          </>
        );
      }
      case EventKind.Reaction: {
        return (
          <FormattedMessage
            defaultMessage="{name} liked"
            values={{
              name: getDisplayName(profile, ev.pubkey),
            }}
          />
        );
      }
    }
  }

  function inner() {
    return (
      <>
        <div className="flex gap-1 text-base font-semibold px-3 py-2 border-b">{action()}</div>
        {refEvent && (
          <NoteQuote
            link={refEvent}
            className=""
            depth={props.depth}
            options={{
              showFooter: true,
              truncate: true,
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-2" ref={ref}>
      {inView && inner()}
    </div>
  );
}
