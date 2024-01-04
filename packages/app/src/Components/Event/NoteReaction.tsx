import "./NoteReaction.css";

import { EventExt,EventKind, NostrEvent, NostrPrefix, TaggedNostrEvent } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import { useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

import Note from "@/Components/Event/Note";
import Icon from "@/Components/Icons/Icon";
import useModeration from "@/Hooks/useModeration";
import { eventLink, getDisplayName,hexToBech32 } from "@/Utils";

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
  const root = useMemo(() => extractRoot(), [ev, props.root, inView]);

  const refEvent = useMemo(() => {
    if (ev) {
      const eTags = ev.tags.filter(a => a[0] === "e");
      if (eTags.length > 0) {
        return eTags[0];
      }
    }
    return null;
  }, [ev]);

  /**
   * Some clients embed the reposted note in the content
   */
  function extractRoot() {
    if (!inView) return null;
    if (ev?.kind === EventKind.Repost && ev.content.length > 0 && ev.content !== "#[0]") {
      try {
        const r: NostrEvent = JSON.parse(ev.content);
        EventExt.fixupEvent(r);
        if (!EventExt.verify(r)) {
          console.debug("Event in repost is invalid");
          return undefined;
        }
        return r as TaggedNostrEvent;
      } catch (e) {
        console.error("Could not load reposted content", e);
      }
    }
    return props.root;
  }

  if (
    ev.kind !== EventKind.Reaction &&
    ev.kind !== EventKind.Repost &&
    (ev.kind !== EventKind.TextNote ||
      ev.tags.every((a, i) => a[1] !== refEvent?.[1] || a[3] !== "mention" || ev.content !== `#[${i}]`))
  ) {
    return null;
  }

  if (!inView) {
    return <div className="card reaction" ref={ref}></div>;
  }
  const isOpMuted = root && isMuted(root.pubkey);
  const shouldNotBeRendered = isOpMuted || root?.kind !== EventKind.TextNote;
  const opt = {
    showHeader: ev?.kind === EventKind.Repost || ev?.kind === EventKind.TextNote,
    showFooter: false,
    truncate: true,
  };

  return shouldNotBeRendered ? null : (
    <div className="card reaction">
      <div className="flex g4">
        <Icon name="repeat" size={18} />
        <FormattedMessage
          defaultMessage="{name} reposted"
          id="+xliwN"
          values={{
            name: getDisplayName(profile, ev.pubkey),
          }}
        />
      </div>
      {root ? <Note data={root} options={opt} related={[]} depth={props.depth} /> : null}
      {!root && refEvent ? (
        <p>
          <Link to={eventLink(refEvent[1] ?? "", refEvent[2])}>
            #{hexToBech32(NostrPrefix.Event, refEvent[1]).substring(0, 12)}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
