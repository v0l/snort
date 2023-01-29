import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperclip } from "@fortawesome/free-solid-svg-icons";

import "./NoteCreator.css";

import useEventPublisher from "Feed/EventPublisher";
import { openFile } from "Util";
import Textarea from "Element/Textarea";
import { default as NEvent } from "Nostr/Event";
import useFileUpload from "Feed/FileUpload";

export interface NoteCreatorProps {
    replyTo?: NEvent,
    onSend?: Function,
    show: boolean,
    autoFocus: boolean
}

export function NoteCreator(props: NoteCreatorProps) {
    const publisher = useEventPublisher();
    const [note, setNote] = useState<string>();
    const [error, setError] = useState<string>();
    const [active, setActive] = useState<boolean>(false);
    const uploader = useFileUpload();

    async function sendNote() {
        if (note) {
            let ev = props.replyTo ? await publisher.reply(props.replyTo, note) : await publisher.note(note);
            console.debug("Sending note: ", ev);
            publisher.broadcast(ev);
            setNote("");
            if (typeof props.onSend === "function") {
                props.onSend();
            }
            setActive(false);
        }
    }

    async function attachFile() {
        try {
            let file = await openFile();
            if (file) {
                let rx = await uploader.upload(file, file.name);
                if (rx.url) {
                    setNote(n => `${n}\n${rx.url}`);
                } else if (rx?.error) {
                    setError(rx.error);
                }
            }
        } catch (error: any) {
            setError(error?.message)
        }
    }

    function onChange(ev: any) {
        const { value } = ev.target
        setNote(value)
        if (value) {
            setActive(true)
        } else {
            setActive(false)
        }
    }

    function onSubmit(ev: React.MouseEvent<HTMLButtonElement>) {
        ev.stopPropagation();
        sendNote().catch(console.warn);
    }

    if (!props.show) return null;
    return (
        <>
            <div className={`flex note-creator ${props.replyTo ? 'note-reply' : ''}`}>
                <div className="flex f-col mr10 f-grow">
                    <Textarea
                        autoFocus={props.autoFocus}
                        className={`textarea ${active ? "textarea--focused" : ""}`}
                        onChange={onChange}
                        value={note}
                        onFocus={() => setActive(true)}
                    />
                    {active && note && (
                        <div className="actions flex f-row">
                            <div className="attachment flex f-row">
                                {(error?.length ?? 0) > 0 ? <b className="error">{error}</b> : null}
                                <FontAwesomeIcon icon={faPaperclip} size="xl" onClick={(e) => attachFile()} />
                            </div>
                            <button type="button" className="btn" onClick={onSubmit}>
                                {props.replyTo ? 'Reply' : 'Send'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
