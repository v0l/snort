import "./DM.css";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useInView } from 'react-intersection-observer';

// @ts-ignore
import useEventPublisher from "../feed/EventPublisher";
// @ts-ignore
import Event from "../nostr/Event";
// @ts-ignore
import NoteTime from "./NoteTime";
// @ts-ignore
import Text from "../Text";

export type DMProps = {
    data: any
}

export default function DM(props: DMProps) {
    const pubKey = useSelector<any>(s => s.login.publicKey);
    const publisher = useEventPublisher();
    const [content, setContent] = useState("Loading...");
    const [decrypted, setDecrypted] = useState(false);
    const { ref, inView, entry } = useInView();

    async function decrypt() {
        let e = Event.FromObject(props.data);
        let decrypted = await publisher.decryptDm(e);
        setContent(decrypted);
    }

    useEffect(() => {
        if (!decrypted && inView) {
            setDecrypted(true);
            decrypt().catch(console.error);
        }
    }, [inView, props.data]);

    return (
        <div className={`flex dm f-col${props.data.pubkey === pubKey ? " me" : ""}`} ref={ref}>
            <div><NoteTime from={props.data.created_at * 1000} /></div>
            <div className="w-max">
                <Text content={content} />
            </div>
        </div>
    )
}