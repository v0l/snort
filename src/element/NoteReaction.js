import "./NoteReaction.css";
import moment from "moment";
import EventKind from "../nostr/EventKind";
import Note from "./Note";
import ProfileImage from "./ProfileImage";
import Event from "../nostr/Event";
import { eventLink } from "../Util";
import { Link } from "react-router-dom";
import { useMemo } from "react";

export default function NoteReaction(props) {
    const ev = props["data-ev"] || Event.FromObject(props.data);

    const refEvent = useMemo(() => {
        if(ev) {
            let eTags = ev.Tags.filter(a => a.Key === "e");
            return eTags[0].Event;
        }
        return null;
    }, [ev]);

    if (ev.Kind !== EventKind.Reaction && ev.Kind !== EventKind.Repost) {
        return null;
    }

    function mapReaction(c) {
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
            case EventKind.Reaction: return <small>Reacted with {mapReaction(ev.Content)}</small>;
            case EventKind.Repost: return <small>Reposted</small>
        }
    }

    /**
     * Some clients embed the reposted note in the content
     */
    function extractRoot() {
        if (ev?.Kind === EventKind.Repost && ev.Content.length > 0) {
            try {
                let r = JSON.parse(ev.Content);
                return r;
            } catch (e) {
                console.error("Could not load reposted content", e);
            }
        }
        return props.root;
    }

    const root = extractRoot();
    const opt = {
        showHeader: ev?.Kind === EventKind.Repost,
        showFooter: ev?.Kind === EventKind.Repost
    };
    return (
        <div className="reaction">
            <div className="header flex">
                <ProfileImage pubkey={ev.RootPubKey} subHeader={tagLine()} />
                <div className="info">
                    {moment(ev.CreatedAt * 1000).fromNow()}
                </div>
            </div>

            {root ? <Note data={root} options={opt} /> : null}
            {!root && refEvent ? <p><Link to={eventLink(refEvent)}>#{refEvent.substring(0, 8)}</Link></p> : null}
        </div>
    );
}