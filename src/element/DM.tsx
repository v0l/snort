import "./DM.css";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

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

    async function decrypt() {
        let e = Event.FromObject(props.data);
        let decrypted = await publisher.decryptDm(e);
        setContent(decrypted);
    }

    useEffect(() => {
        decrypt().catch(console.error);
    }, [props.data]);

    return (
        <div className={`flex dm f-col${props.data.pubkey === pubKey ? " me" : ""}`}>
            <div><NoteTime from={props.data.created_at * 1000} /></div>
            <div className="w-max">
                <Text content={content} />
            </div>
        </div>
    )
}