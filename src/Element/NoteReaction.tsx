import "./NoteReaction.css";
import { Link } from "react-router-dom";
import { useMemo } from "react";

import EventKind from "Nostr/EventKind";
import Note from "Element/Note";
import ProfileImage from "Element/ProfileImage";
import { default as NEvent } from "Nostr/Event";
import { eventLink, hexToBech32 } from "Util";
import NoteTime from "Element/NoteTime";
import { RawEvent, TaggedRawEvent } from "Nostr";
import useModeration from "Hooks/useModeration";

export interface NoteReactionProps {
    data?: TaggedRawEvent,
    ["data-ev"]?: NEvent,
    root?: TaggedRawEvent
}
export default function NoteReaction(props: NoteReactionProps) {
    const { ["data-ev"]: dataEv, data } = props;
    const ev = useMemo(() => dataEv || new NEvent(data), [data, dataEv])
    const { isMuted } = useModeration();
    const pRef = data?.tags.find((a: any) => a[0] === "p")?.at(1);
    const isRefMuted = pRef && isMuted(pRef)

    const refEvent = useMemo(() => {
        if (ev) {
            let eTags = ev.Tags.filter(a => a.Key === "e");
            if (eTags.length > 0) {
                return eTags[0].Event;
            }
        }
        return null;
    }, [ev]);

    if (ev.Kind !== EventKind.Reaction && ev.Kind !== EventKind.Repost) {
        return null;
    }

    /**
     * Some clients embed the reposted note in the content
     */
    function extractRoot() {
        if (ev?.Kind === EventKind.Repost && ev.Content.length > 0) {
            try {
                let r: RawEvent = JSON.parse(ev.Content);
                return r as TaggedRawEvent;
            } catch (e) {
                console.error("Could not load reposted content", e);
            }
        }
        return props.root;
    }

    const root = extractRoot();
    const opt = {
        showHeader: ev?.Kind === EventKind.Repost,
        showFooter: false,
    };
    const isOpMuted = root && isMuted(root.pubkey)

    return isOpMuted || isRefMuted ? null : (
        <div className="reaction">
            <div className="header flex">
                <ProfileImage pubkey={ev.RootPubKey} />
                <div className="info">
                    <NoteTime from={ev.CreatedAt * 1000} />
                </div>
            </div>

            {root ? <Note data={root} options={opt} related={[]}/> : null}
            {!root && refEvent ? <p><Link to={eventLink(refEvent)}>#{hexToBech32("note", refEvent).substring(0, 12)}</Link></p> : null}
        </div>
    );
}
