import "./Note.css";
import { useCallback, useState } from "react";
import { useSelector } from "react-redux";
import moment from "moment";
import { Link, useNavigate } from "react-router-dom";
import { faHeart, faThumbsDown, faReply, faInfo, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import Event from "../nostr/Event";
import ProfileImage from "./ProfileImage";
import useEventPublisher from "../feed/EventPublisher";
import { NoteCreator } from "./NoteCreator";
import { extractLinks, extractMentions, extractInvoices } from "../Text";
import { eventLink } from "../Util";

export default function Note(props) {
    const navigate = useNavigate();
    const data = props.data;
    const opt = props.options;
    const dataEvent = props["data-ev"];
    const reactions = props.reactions;
    const deletion = props.deletion;
    const likes = reactions?.filter(({ Content }) => Content === "+").length ?? 0
    const dislikes = reactions?.filter(({ Content }) => Content === "-").length ?? 0
    const publisher = useEventPublisher();
    const [showReply, setShowReply] = useState(false);
    const users = useSelector(s => s.users?.users);
    const login = useSelector(s => s.login.publicKey);
    const ev = dataEvent ?? Event.FromObject(data);
    const isMine = ev.PubKey === login;

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
        let thread = ev.GetThread();
        if (thread === null) {
            return null;
        }

        let replyId = thread?.ReplyTo?.Event;
        let mentions = thread?.PubKeys?.map(a => [a, users[a]])?.map(a => a[1]?.name ?? a[0].substring(0, 8));
        return (
            <div className="reply" onClick={(e) => goToEvent(e, replyId)}>
                ➡️ {mentions?.join(", ") ?? replyId?.substring(0, 8)}
            </div>
        )
    }

    async function like() {
        let evLike = await publisher.like(ev);
        publisher.broadcast(evLike);
    }

    async function dislike() {
        let evLike = await publisher.dislike(ev);
        publisher.broadcast(evLike);
    }

    async function deleteEvent() {
        if (window.confirm(`Are you sure you want to delete ${ev.Id.substring(0, 8)}?`)) {
            let evDelete = await publisher.delete(ev.Id);
            publisher.broadcast(evDelete);
        }
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
        <div className="note">
            {options.showHeader ?
                <div className="header flex">
                    <ProfileImage pubkey={ev.PubKey} subHeader={replyTag()} />
                    {options.showTime ?
                        <div className="info">
                            {moment(ev.CreatedAt * 1000).fromNow()}
                        </div> : null}
                </div> : null}
            <div className="body" onClick={(e) => goToEvent(e, ev.Id)}>
                {transformBody()}
            </div>
            {options.showFooter ?
                <div className="footer">
                    {isMine ? <span className="pill">
                        <FontAwesomeIcon icon={faTrash} onClick={() => deleteEvent()} />
                    </span> : null}
                    <span className="pill" onClick={() => setShowReply(!showReply)}>
                        <FontAwesomeIcon icon={faReply} />
                    </span>
                    <span className="pill" onClick={() => like()}>
                        <FontAwesomeIcon icon={faHeart} /> &nbsp;
                        {likes}
                    </span>
                    <span className="pill" onClick={() => dislike()}>
                        <FontAwesomeIcon icon={faThumbsDown} /> &nbsp;
                        {dislikes}
                    </span>
                    <span className="pill" onClick={() => console.debug(ev)}>
                        <FontAwesomeIcon icon={faInfo} />
                    </span>
                </div> : null}
            {showReply ? <NoteCreator replyTo={ev} onSend={() => setShowReply(false)} /> : null}
        </div>
    )
}