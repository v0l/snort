import "./NoteReaction.css";
import { Link } from "react-router-dom";
import { useMemo } from "react";

import { EventKind, Event as NEvent } from "@snort/nostr";
import Note from "Element/Note";
import ProfileImage from "Element/ProfileImage";
import { eventLink, hexToBech32 } from "Util";
import NoteTime from "Element/NoteTime";
import { RawEvent, TaggedRawEvent } from "@snort/nostr";
import useModeration from "Hooks/useModeration";

export interface NoteReactionProps {
  data?: TaggedRawEvent;
  ["data-ev"]?: NEvent;
  root?: TaggedRawEvent;
}
export default function NoteReaction(props: NoteReactionProps) {
  const { ["data-ev"]: dataEv, data } = props;
  const ev = useMemo(() => dataEv || new NEvent(data), [data, dataEv]);
  const { isMuted } = useModeration();

  const refEvent = useMemo(() => {
    if (ev) {
      const eTags = ev.Tags.filter(a => a.Key === "e");
      if (eTags.length > 0) {
        return eTags[0].Event;
      }
    }
    return null;
  }, [ev]);

  if (
    ev.Kind !== EventKind.Reaction &&
    ev.Kind !== EventKind.Repost &&
    (ev.Kind !== EventKind.TextNote ||
      ev.Tags.every((a, i) => a.Event !== refEvent || a.Marker !== "mention" || ev.Content !== `#[${i}]`))
  ) {
    return null;
  }

  /**
   * Some clients embed the reposted note in the content
   */
  function extractRoot() {
    if (ev?.Kind === EventKind.Repost && ev.Content.length > 0 && ev.Content !== "#[0]") {
      try {
        const r: RawEvent = JSON.parse(ev.Content);
        return r as TaggedRawEvent;
      } catch (e) {
        console.error("Could not load reposted content", e);
      }
    }
    return props.root;
  }

  const root = extractRoot();
  const isOpMuted = root && isMuted(root.pubkey);
  const shouldBeNotBeRendered = isOpMuted || root?.kind === EventKind.BadgeAward;
  const opt = {
    showHeader: ev?.Kind === EventKind.Repost || ev?.Kind === EventKind.TextNote,
    showFooter: false,
  };

  return shouldBeNotBeRendered ? null : (
    <div className="reaction">
      <div className="header flex">
        <ProfileImage pubkey={ev.RootPubKey} />
        <div className="info">
          <NoteTime from={ev.CreatedAt * 1000} />
        </div>
      </div>
      {root ? <Note data={root} options={opt} related={[]} /> : null}
      {!root && refEvent ? (
        <p>
          <Link to={eventLink(refEvent)}>#{hexToBech32("note", refEvent).substring(0, 12)}</Link>
        </p>
      ) : null}
    </div>
  );
}
