import "./Note.css";
import { useState } from "react";
import { useSelector } from "react-redux";
import moment from "moment";
import { Link, useNavigate } from "react-router-dom";
import { faHeart, faReply, faInfo } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import Event from "../nostr/Event";
import ProfileImage from "./ProfileImage";
import useEventPublisher from "../feed/EventPublisher";
import { NoteCreator } from "./NoteCreator";

const UrlRegex = /((?:http|ftp|https):\/\/(?:[\w+?\.\w+])+(?:[a-zA-Z0-9\~\!\@\#\$\%\^\&\*\(\)_\-\=\+\\\/\?\.\:\;\'\,]*)?)/i;
const FileExtensionRegex = /\.([\w]+)$/i;
const MentionRegex = /(#\[\d+\])/gi;

export default function Note(props) {
    const navigate = useNavigate();
    const data = props.data;
    const dataEvent = props["data-ev"];
    const reactions = props.reactions;
    const publisher = useEventPublisher();
    const [showReply, setShowReply] = useState(false);
    const users = useSelector(s => s.users?.users);
    const ev = dataEvent ?? Event.FromObject(data);

    function goToEvent(e, id) {
        if (!window.location.pathname.startsWith("/e/")) {
            e.stopPropagation();
            navigate(`/e/${id}`);
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

    function transformBody() {
        let body = ev.Content;
        let urlBody = body.split(UrlRegex);

        return urlBody.map(a => {
            if (a.startsWith("http")) {
                let url = new URL(a);
                let ext = url.pathname.toLowerCase().match(FileExtensionRegex);
                if (ext) {
                    switch (ext[1]) {
                        case "gif":
                        case "jpg":
                        case "jpeg":
                        case "png":
                        case "bmp":
                        case "webp": {
                            return <img key={url} src={url} />;
                        }
                        case "mp4":
                        case "mkv":
                        case "avi":
                        case "m4v": {
                            return <video key={url} src={url} controls />
                        }
                    }
                } else {
                    return <a href={url}>{url.toString()}</a>
                }
            } else {
                let mentions = a.split(MentionRegex).map((match) => {
                    let matchTag = match.match(/#\[(\d+)\]/);
                    if (matchTag && matchTag.length === 2) {
                        let idx = parseInt(matchTag[1]);
                        let ref = ev.Tags.find(a => a.Index === idx);
                        if (ref) {
                            switch (ref.Key) {
                                case "p": {
                                    let pUser = users[ref.PubKey]?.name ?? ref.PubKey.substring(0, 8);
                                    return <Link key={ref.PubKey} to={`/p/${ref.PubKey}`}>@{pUser}</Link>;
                                }
                                case "e": {
                                    let eText = ref.Event.substring(0, 8);
                                    return <Link key={ref.Event} to={`/e/${ref.Event}`}>#{eText}</Link>;
                                }
                            }
                        }
                        return <b style={{ color: "red" }}>{matchTag[0]}?</b>;
                    } else {
                        return match;
                    }
                });
                return mentions;
            }
            return a;
        });
    }

    async function like() {
        let evLike = await publisher.like(ev);
        publisher.broadcast(evLike);
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
            <div className="header">
                <ProfileImage pubKey={ev.PubKey} subHeader={replyTag()} />
                <div className="info">
                    {moment(ev.CreatedAt * 1000).fromNow()}
                </div>
            </div>
            <div className="body" onClick={(e) => goToEvent(e, ev.Id)}>
                {transformBody()}
            </div>
            <div className="footer">
                <span className="pill" onClick={() => setShowReply(!showReply)}>
                    <FontAwesomeIcon icon={faReply} />
                </span>
                <span className="pill" onClick={() => like()}>
                    <FontAwesomeIcon icon={faHeart} /> &nbsp;
                    {(reactions?.length ?? 0)}
                </span>
                <span className="pill" onClick={() => console.debug(ev)}>
                    <FontAwesomeIcon icon={faInfo} />
                </span>
            </div>
            {showReply ? <NoteCreator replyTo={ev} onSend={() => setShowReply(false)}/> : null}
        </div>
    )
}