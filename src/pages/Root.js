import "./Root.css";
import Timeline from "./Timeline";
import { useSelector } from "react-redux";
import { useContext, useState } from "react";
import Event from "../nostr/Event";
import { NostrContext } from "..";

export default function RootPage() {
    const system = useContext(NostrContext);
    const pubKey = useSelector(s => s.login.publicKey);
    const privKey = useSelector(s => s.login.privateKey);
    const [note, setNote] = useState("");

    async function sendNote() {
        let ev = Event.NewNote(pubKey, note);
        await ev.Sign(privKey);

        console.debug("Sending note: ", ev);
        system.BroadcastEvent(ev);
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