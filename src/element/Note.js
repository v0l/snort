import "./Note.css";
import { useCallback } from "react";
import { useSelector } from "react-redux";
import moment from "moment";
import { useNavigate } from "react-router-dom";

import Event from "../nostr/Event";
import ProfileImage from "./ProfileImage";
import { extractLinks, extractMentions, extractInvoices } from "../Text";
import { eventLink } from "../Util";
import NoteFooter from "./NoteFooter";

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

        let replyId = ev.Thread?.ReplyTo?.Event;
        let mentions = ev.Thread?.PubKeys?.map(a => [a, users[a]])?.map(a => a[1]?.name ?? a[0].substring(0, 8));
        return (
            <div className="reply" onClick={(e) => goToEvent(e, replyId)}>
                ➡️ {mentions?.join(", ") ?? replyId?.substring(0, 8)}
            </div>
        )
    }

    if (!ev.IsContent()) {
        return (
            <>
                <pre>{ev.Id}</pre>
                <pre>Kind: {ev.Kind}</pre>
                <pre>Content: {ev.Content}</pre>
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
                            {moment(ev.CreatedAt * 1000).fromNow()}
                        </div> : null}
                </div> : null}
            <div className="body" onClick={(e) => goToEvent(e, ev.Id)}>
                {transformBody()}
            </div>
            {options.showFooter ? <NoteFooter ev={ev} reactions={reactions} /> : null}
        </div>
    )
}