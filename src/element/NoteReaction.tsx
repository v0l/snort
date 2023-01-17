import "./NoteReaction.css";
import EventKind from "../nostr/EventKind";
import Note from "./Note";
import ProfileImage from "./ProfileImage";
import { default as NEvent } from "../nostr/Event";
import { eventLink, hexToBech32 } from "../Util";
import { Link } from "react-router-dom";
import { useMemo } from "react";
import NoteTime from "./NoteTime";
import { RawEvent, TaggedRawEvent } from "../nostr";

export interface NoteReactionProps {
    data?: TaggedRawEvent,
    ["data-ev"]?: NEvent,
    root?: TaggedRawEvent
}
export default function NoteReaction(props: NoteReactionProps) {
    const ev = useMemo(() => props["data-ev"] || new NEvent(props.data), [props.data, props["data-ev"]])

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

    function mapReaction(c: string) {
        switch (c) {
            case "+": return "❤️";
            case "-": return "👎";
            default: {
                if (c.length === 0) {
                    return "❤️";
                }
                return c;
            }
        }
    }

    function tagLine() {
        switch (ev.Kind) {
            case EventKind.Reaction: return <small className="reaction-text">reacted with {mapReaction(ev.Content)}</small>;
            case EventKind.Repost: return <small className="reaction-text">reposted</small>
        }
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
        showFooter: ev?.Kind === EventKind.Repost,
    };

    return (
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
