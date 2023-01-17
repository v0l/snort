import "./DM.css";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useInView } from 'react-intersection-observer';

import useEventPublisher from "../feed/EventPublisher";
import Event from "../nostr/Event";
import NoteTime from "./NoteTime";
import Text from "./Text";
import { lastReadDm, setLastReadDm } from "../pages/MessagesPage";

export type DMProps = {
    data: any
}

export default function DM(props: DMProps) {
    const pubKey = useSelector<any>(s => s.login.publicKey);
    const publisher = useEventPublisher();
    const [content, setContent] = useState("Loading...");
    const [decrypted, setDecrypted] = useState(false);
    const { ref, inView, entry } = useInView();
    const isMe = props.data.pubkey === pubKey;

    async function decrypt() {
        let e = new Event(props.data);
        if (!isMe) {
            setLastReadDm(e.PubKey);
        }
        let decrypted = await publisher.decryptDm(e);
        setContent(decrypted || "<ERROR>");
    }

    useEffect(() => {
        if (!decrypted && inView) {
            setDecrypted(true);
            decrypt().catch(console.error);
        }
    }, [inView, props.data]);

    return (
        <div className={`flex dm f-col${isMe ? " me" : ""}`} ref={ref}>
            <div><NoteTime from={props.data.created_at * 1000} fallback={'Just now'} /></div>
            <div className="w-max">
                <Text content={content} tags={[]} users={new Map()} />
            </div>
        </div>
    )
}
