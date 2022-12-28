import "./Root.css";
import { useSelector } from "react-redux";
import {  useState } from "react";
import Timeline from "./Timeline";
import useEventPublisher from "./feed/EventPublisher";

export default function RootPage() {
    const publisher = useEventPublisher();
    const pubKey = useSelector(s => s.login.publicKey);

    const [note, setNote] = useState("");

    async function sendNote() {
        let ev = await publisher.note(note);

        console.debug("Sending note: ", ev);
        publisher.broadcast(ev);
        setNote("");
    }

    function noteSigner() {
        return (
            <div className="send-note">
                <input type="text" placeholder="Sup?" value={note} onChange={(e) => setNote(e.target.value)}></input>
                <div className="btn" onClick={() => sendNote()}>Send</div>
            </div>
        );
    }

    return (
        <>
            {pubKey ? noteSigner() : null}
            <Timeline></Timeline>
        </>
    );
}