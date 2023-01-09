import "./Note.css";
import { useCallback } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import Event from "../nostr/Event";
import ProfileImage from "./ProfileImage";
import { extractLinks, extractMentions, extractInvoices } from "../Text";
import { eventLink, hexToBech32 } from "../Util";
import NoteFooter from "./NoteFooter";
import NoteTime from "./NoteTime";

export default function Note(props) {
    const navigate = useNavigate();
    const data = props.data;
    const opt = props.options;
    const dataEvent = props["data-ev"];
    const reactions = props.reactions;
    const deletion = props.deletion;
    const hightlight = props.hightlight;

    const users = useSelector(s => s.users?.users);
    const ev = dataEvent ?? Event.FromObject(data);

    const options = {
        showHeader: true,
        showTime: true,
        showFooter: true,
        ...opt
    };

    const transformBody = useCallback(() => {
        let body = ev?.Content ?? "";

        let fragments = extractLinks([body]);
        fragments = extractMentions(fragments, ev.Tags, users);
        fragments = extractInvoices(fragments);
        if (deletion?.length > 0) {
            return (
                <>
                    <b className="error">Deleted</b>
                </>
            );
        }
        return fragments;
    }, [data, dataEvent, reactions, deletion]);

    function goToEvent(e, id) {
        if (!window.location.pathname.startsWith("/e/")) {
            e.stopPropagation();
            navigate(eventLink(id));
        }
    }

    function replyTag() {
        if (ev.Thread === null) {
            return null;
        }

        const maxMentions = 2;
        let replyId = ev.Thread?.ReplyTo?.Event;
        let mentions = ev.Thread?.PubKeys?.map(a => [a, users[a]])?.map(a => a[1]?.name ?? hexToBech32("npub", a[0]).substring(0, 12))
            .sort((a, b) => a.startsWith("npub") ? 1 : -1);
        let pubMentions = mentions.length > maxMentions ? `${mentions?.slice(0, maxMentions).join(", ")} & ${mentions.length - maxMentions} others` : mentions?.join(", ");
        return (
            <div className="reply">
                ➡️ {pubMentions ?? hexToBech32("note", replyId).substring(0, 12)}
            </div>
        )
    }

    if (!ev.IsContent()) {
        return (
            <>
                <h4>Unknown event kind: {ev.Kind}</h4>
                <pre>
                    {JSON.stringify(ev.ToObject(), undefined, '  ')}
                </pre>
            </>
        );
    }

    return (
        <div className={`note ${hightlight ? "active" : ""}`}>
            {options.showHeader ?
                <div className="header flex">
                    <ProfileImage pubkey={ev.RootPubKey} subHeader={replyTag()} />
                    {options.showTime ?
                        <div className="info">
                            <NoteTime from={ev.CreatedAt * 1000} />
                        </div> : null}
                </div> : null}
            <div className="body" onClick={(e) => goToEvent(e, ev.Id)}>
                {transformBody()}
            </div>
            {options.showFooter ? <NoteFooter ev={ev} reactions={reactions} /> : null}
        </div>
    )
}