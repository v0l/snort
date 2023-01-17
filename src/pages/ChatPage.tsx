import "./ChatPage.css";
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { useInView } from 'react-intersection-observer';

import ProfileImage from "../element/ProfileImage";
import { bech32ToHex } from "../Util";
import useEventPublisher from "../feed/EventPublisher";

import DM from "../element/DM";
import { RawEvent } from "../nostr";
import { dmsInChat } from "./MessagesPage";

type RouterParams = {
    id: string
}

export default function ChatPage() {
    const params = useParams<RouterParams>();
    const publisher = useEventPublisher();
    const id = bech32ToHex(params.id ?? "");
    const dms = useSelector<any, RawEvent[]>(s => filterDms(s.login.dms));
    const [content, setContent] = useState<string>();
    const { ref, inView, entry } = useInView();
    const dmListRef = useRef<HTMLDivElement>(null);

    function filterDms(dms: RawEvent[]) {
        return dmsInChat(dms, id);
    }

    const sortedDms = useMemo<any[]>(() => {
        return [...dms].sort((a, b) => a.created_at - b.created_at)
    }, [dms]);

    useEffect(() => {
        if (inView && dmListRef.current) {
            dmListRef.current.scroll(0, dmListRef.current.scrollHeight);
        }
    }, [inView, dmListRef, sortedDms]);

    async function sendDm() {
        if (content) {
            let ev = await publisher.sendDm(content, id);
            console.debug(ev);
            publisher.broadcast(ev);
            setContent("");
        }
    }

    async function onEnter(e: KeyboardEvent) {
        let isEnter = e.code === "Enter";
        if (isEnter && !e.shiftKey) {
            await sendDm();
        }
    }

    return (
        <>
            <ProfileImage pubkey={id} className="f-grow mb10" />
            <div className="dm-list" ref={dmListRef}>
                <div>
                    {sortedDms.map(a => <DM data={a} key={a.id} />)}
                    <div ref={ref} className="mb10"></div>
                </div>
            </div>
            <div className="write-dm">
                <div className="inner">
                    <textarea className="f-grow mr10" value={content} onChange={(e) => setContent(e.target.value)} onKeyDown={(e) => onEnter(e)}></textarea>
                    <div className="btn" onClick={() => sendDm()}>Send</div>
                </div>
            </div>
        </>
    )
}