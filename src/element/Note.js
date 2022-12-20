import "./Note.css";
import Event from "../nostr/Event";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import moment from "moment";
import { Link, useNavigate } from "react-router-dom";
import { isFulfilled } from "@reduxjs/toolkit";

const UrlRegex = /((?:http|ftp|https):\/\/(?:[\w+?\.\w+])+(?:[a-zA-Z0-9\~\!\@\#\$\%\^\&\*\(\)_\-\=\+\\\/\?\.\:\;\'\,]*)?)/;
const FileExtensionRegex = /\.([\w]+)$/;
const MentionRegex = /(#\[\d+\])/g;

export default function Note(props) {
    const navigate = useNavigate();
    const data = props.data;
    const [sig, setSig] = useState(false);
    const users = useSelector(s => s.users?.users);
    const user = users[data?.pubkey];
    const ev = Event.FromObject(data);

    useEffect(() => {
        if (sig === false) {
            verifyEvent();
        }
    }, []);

    async function verifyEvent() {
        let res = await ev.Verify();
        setSig(res);
    }

    function goToProfile(e, id) {
        e.stopPropagation();
        navigate(`/p/${id}`);
    }

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
        let pTags = ev.Tags.filter(a => a.Key === "p");

        let urlBody = body.split(UrlRegex);

        return urlBody.map(a => {
            if (a.startsWith("http")) {
                let url = new URL(a);
                let ext = url.pathname.match(FileExtensionRegex);
                if (ext) {
                    switch (ext[1]) {
                        case "gif":
                        case "jpg":
                        case "jpeg":
                        case "png":
                        case "bmp":
                        case "webp": {
                            return <img src={url} />;
                        }
                        case "mp4":
                        case "mkv":
                        case "avi":
                        case "m4v": {
                            return <video src={url} controls />
                        }
                    }
                }
            } else {
                let mentions = a.split(MentionRegex).map((match) => {
                    if (match.startsWith("#")) {
                        let pref = pTags[match.match(/\[(\d+)\]/)[1]];
                        if (pref) {
                            let pUser = users[pref.PubKey]?.name ?? pref.PubKey.substring(0, 8);
                            return <Link to={`/p/${pref.PubKey}`}>#{pUser}</Link>;
                        } else {
                            return <pre>BROKEN REF: {match[0]}</pre>;
                        }
                    } else {
                        return match;
                    }
                });
                return mentions;
            }
        });
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
                <img src={user?.picture} onClick={(e) => goToProfile(e, ev.PubKey)} />
                <div className="name">
                    {user?.name ?? ev.PubKey.substring(0, 8)}
                    {replyTag()}
                </div>
                <div className="info">
                    {moment(ev.CreatedAt * 1000).fromNow()}
                </div>
            </div>
            <div className="body" onClick={(e) => goToEvent(e, ev.Id)}>
                {transformBody()}
            </div>
        </div>
    )
}