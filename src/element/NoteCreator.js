import "./NoteCreator.css";
import { useState } from "react";
import useEventPublisher from "../feed/EventPublisher";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperclip } from "@fortawesome/free-solid-svg-icons";
import { openFile } from "../Util";
import VoidUpload from "../feed/VoidUpload";
import { FileExtensionRegex } from "../Const";

export function NoteCreator(props) {
    const replyTo = props.replyTo;
    const onSend = props.onSend;
    const publisher = useEventPublisher();
    const [note, setNote] = useState("");
    const [error, setError] = useState("");

    async function sendNote() {
        let ev = replyTo ?
            await publisher.reply(replyTo, note)
            : await publisher.note(note);

        console.debug("Sending note: ", ev);
        publisher.broadcast(ev);
        setNote("");
        if (typeof onSend === "function") {
            onSend();
        }
    }

    async function attachFile() {
        let file = await openFile();
        let rsp = await VoidUpload(file);
        let ext = file.name.match(FileExtensionRegex)[1];

        // extension tricks note parser to embed the content
        let url = rsp.metadata.url ?? `https://void.cat/d/${rsp.id}.${ext}`;

        setNote(n => `${n}\n{url}`);
    }

    return (
        <>
            {replyTo ? <small>{`Reply to: ${replyTo.Id.substring(0, 8)}`}</small> : null}
            <div className="flex note-creator">
                <div className="flex f-col mr10 f-grow">
                    <textarea placeholder="Say something!" value={note} onChange={(e) => setNote(e.target.value)} />
                    <div className="actions">
                        <FontAwesomeIcon icon={faPaperclip} size="xl" onClick={(e) => attachFile()}/>
                        {error.length > 0 ? <b className="error">{error}</b> : null}
                    </div>
                </div>
                <div className="btn" onClick={() => sendNote()}>Send</div>
            </div>
        </>
    );
}