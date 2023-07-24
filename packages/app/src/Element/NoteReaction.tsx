import "./NoteReaction.css";
import { Link } from "react-router-dom";
import { useMemo } from "react";
import { EventKind, NostrEvent, TaggedNostrEvent, NostrPrefix } from "@snort/system";

import Note from "Element/Note";
import { getDisplayName } from "Element/ProfileImage";
import { eventLink, hexToBech32 } from "SnortUtils";
import useModeration from "Hooks/useModeration";
import { FormattedMessage } from "react-intl";
import Icon from "Icons/Icon";
import { useUserProfile } from "@snort/system-react";
import { System } from "index";

export interface NoteReactionProps {
  data: TaggedNostrEvent;
  root?: TaggedNostrEvent;
}
export default function NoteReaction(props: NoteReactionProps) {
  const { data: ev } = props;
  const { isMuted } = useModeration();
  const profile = useUserProfile(System, ev.pubkey);

  const refEvent = useMemo(() => {
    if (ev) {
      const eTags = ev.tags.filter(a => a[0] === "e");
      if (eTags.length > 0) {
        return eTags[0];
      }
    }
    return null;
  }, [ev]);

  if (
    ev.kind !== EventKind.Reaction &&
    ev.kind !== EventKind.Repost &&
    (ev.kind !== EventKind.TextNote ||
      ev.tags.every((a, i) => a[1] !== refEvent?.[1] || a[3] !== "mention" || ev.content !== `#[${i}]`))
  ) {
    return null;
  }

  /**
   * Some clients embed the reposted note in the content
   */
  function extractRoot() {
    if (ev?.kind === EventKind.Repost && ev.content.length > 0 && ev.content !== "#[0]") {
      try {
        const r: NostrEvent = JSON.parse(ev.content);
        return r as TaggedNostrEvent;
      } catch (e) {
        console.error("Could not load reposted content", e);
      }
    }
    return props.root;
  }

  const root = extractRoot();
  const isOpMuted = root && isMuted(root.pubkey);
  const shouldNotBeRendered = isOpMuted || root?.kind !== EventKind.TextNote;
  const opt = {
    showHeader: ev?.kind === EventKind.Repost || ev?.kind === EventKind.TextNote,
    showFooter: false,
  };

  return shouldNotBeRendered ? null : (
    <div className="card reaction">
      <div className="flex g4">
        <Icon name="repeat" size={18} />
        <FormattedMessage
          defaultMessage="{name} reposted"
          values={{
            name: getDisplayName(profile, ev.pubkey),
          }}
        />
      </div>
      {root ? <Note data={root} options={opt} related={[]} /> : null}
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
