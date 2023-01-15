import { useState, Component } from "react";
import { useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperclip } from "@fortawesome/free-solid-svg-icons";

import "./NoteCreator.css";

import useEventPublisher from "../feed/EventPublisher";
import { openFile } from "../Util";
import VoidUpload from "../feed/VoidUpload";
import { FileExtensionRegex } from "../Const";
import Textarea from "../element/Textarea";

export function NoteCreator(props) {
    const replyTo = props.replyTo;
    const onSend = props.onSend;
    const show = props.show || false;
    const publisher = useEventPublisher();
    const [note, setNote] = useState("");
    const [error, setError] = useState("");
    const [active, setActive] = useState(false);
    const users = useSelector((state) => state.users.users)

    async function sendNote() {
        let ev = replyTo ? await publisher.reply(replyTo, note) : await publisher.note(note);
        console.debug("Sending note: ", ev);
        publisher.broadcast(ev);
        setNote("");
        setActive(false);
        if (typeof onSend === "function") {
            onSend();
        }
    }

    async function attachFile() {
        try {
            let file = await openFile();
            let rsp = await VoidUpload(file);
            let ext = file.name.match(FileExtensionRegex)[1];

            // extension tricks note parser to embed the content
            let url = rsp.metadata.url ?? `https://void.cat/d/${rsp.id}.${ext}`;

            setNote(n => `${n}\n${url}`);
        } catch (error) {
            setError(error?.message)
        }
    }

    function onChange(ev) {
        const { value } = ev.target
        if (value) {
          setNote(value)
          setActive(true)
        } else {
          setActive(false)
        }
    }

    if (!show) return false;
    return (
        <>
            {replyTo ? <small>{`Reply to: ${replyTo.Id.substring(0, 8)}`}</small> : null}
            <div className="flex note-creator">
                <div className="flex f-col mr10 f-grow">
                    <Textarea
                      className={`textarea ${active ? "textarea--focused" : ""}`}
                      users={users}
                      onChange={onChange}
                      onFocus={() => setActive(true)}
                    />
                    <div className="actions flex f-row">
                        <div className="attachment flex f-row">
                            {error.length > 0 ? <b className="error">{error}</b> : null}
                            <FontAwesomeIcon icon={faPaperclip} size="xl" onClick={(e) => attachFile()} />
                        </div>
                        <div className="btn" onClick={() => sendNote()}>Send</div>
                    </div>
                </div>
            </div>
        </>
    );
}