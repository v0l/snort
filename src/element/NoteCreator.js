import { useState } from "react";
import useEventPublisher from "../feed/EventPublisher";

export function NoteCreator(props) {
    const replyTo = props.replyTo;
    const onSend = props.onSend;
    const publisher = useEventPublisher();
    const [note, setNote] = useState("");

    async function sendNote() {
        let ev = replyTo ?
            await publisher.reply(replyTo, note)
            : await publisher.note(note);

        console.debug("Sending note: ", ev);
        publisher.broadcast(ev);
        setNote("");
        if(typeof onSend === "function") {
            onSend();
        }
    }

    return (
        <>
            {replyTo ? <small>{`Reply to: ${replyTo.Id.substring(0, 8)}`}</small> : null}
            <div className="flex">
                <input type="text" placeholder="Sup?" value={note} onChange={(e) => setNote(e.target.value)} className="f-grow mr10"></input>
                <div className="btn" onClick={() => sendNote()}>Send</div>
            </div>
        </>
    );
}