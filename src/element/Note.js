import "./Note.css";
import Event from "../nostr/Event";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import moment from "moment";
import { useNavigate } from "react-router-dom";

export default function Note(props) {
    const navigate = useNavigate();
    const data = props.data;
    const [sig, setSig] = useState(false);
    const user = useSelector(s => s.users?.users[data?.pubkey]);
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
        e.stopPropagation();
        navigate(`/e/${id}`);
    }

    function replyTag() {
        let thread = ev.GetThread();
        if (thread === null) {
            return null;
        }

        let replyId = thread.ReplyTo.Event;
        return (
            <div className="reply" onClick={(e) => goToEvent(e, replyId)}>
                ➡️ {replyId.substring(0, 8)}
            </div>
        )
    }

    if(!ev.IsContent()) {
        return <pre>Event: {ev.Id}</pre>;
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
                {ev.Content}
            </div>
        </div>
    )
}