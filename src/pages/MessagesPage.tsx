import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux"

import { HexKey, RawEvent } from "../nostr";
import UnreadCount from "../element/UnreadCount";
import ProfileImage from "../element/ProfileImage";
import { hexToBech32 } from "../Util";
import { incDmInteraction } from "../state/Login";
import { RootState } from "../state/Store";
import NoteToSelf from "../element/NoteToSelf";

type DmChat = {
    pubkey: HexKey,
    unreadMessages: number,
    newestMessage: number
}

export default function MessagesPage() {
    const dispatch = useDispatch();
    const myPubKey = useSelector<RootState, HexKey | undefined>(s => s.login.publicKey);
    const dms = useSelector<RootState, RawEvent[]>(s => s.login.dms);
    const dmInteraction = useSelector<RootState, number>(s => s.login.dmInteraction);

    const chats = useMemo(() => {
        return extractChats(dms, myPubKey!);
    }, [dms, myPubKey, dmInteraction]);

    function noteToSelf(chat: DmChat) {
        return (
            <div className="flex mb10" key={chat.pubkey}>
                <NoteToSelf clickable={true} className="f-grow" link={`/messages/${hexToBech32("npub", chat.pubkey)}`} pubkey={chat.pubkey} />
            </div>
        )
    }

    function person(chat: DmChat) {
        if(chat.pubkey === myPubKey) return noteToSelf(chat)
        return (
            <div className="flex mb10" key={chat.pubkey}>
                <ProfileImage pubkey={chat.pubkey} className="f-grow" link={`/messages/${hexToBech32("npub", chat.pubkey)}`} />
                <UnreadCount unread={chat.unreadMessages} />
            </div>
        )
    }

    function markAllRead() {
        for (let c of chats) {
            setLastReadDm(c.pubkey);
        }
        dispatch(incDmInteraction());
    }

    return (
        <>
            <div className="flex">
                <h3 className="f-grow">Messages</h3>
                <div className="btn" onClick={() => markAllRead()}>Mark All Read</div>
            </div>
            {chats.sort((a, b) => {
                if(b.pubkey === myPubKey) return 1
                return b.newestMessage - a.newestMessage
            }).map(person)}
        </>
    )
}

export function lastReadDm(pk: HexKey) {
    let k = `dm:seen:${pk}`;
    return parseInt(window.localStorage.getItem(k) ?? "0");
}

export function setLastReadDm(pk: HexKey) {
    const now = Math.floor(new Date().getTime() / 1000);
    let current = lastReadDm(pk);
    if (current >= now) {
        return;
    }

    let k = `dm:seen:${pk}`;
    window.localStorage.setItem(k, now.toString());
}

export function dmTo(e: RawEvent) {
    let firstP = e.tags.find(b => b[0] === "p");
    return firstP ? firstP[1] : "";
}

export function isToSelf(e: RawEvent, pk: HexKey) {
    return e.pubkey === pk && dmTo(e) === pk;
}

export function dmsInChat(dms: RawEvent[], pk: HexKey) {
    return dms.filter(a => a.pubkey === pk || dmTo(a) == pk);
}

export function totalUnread(dms: RawEvent[], myPubKey: HexKey) {
    return extractChats(dms, myPubKey).reduce((acc, v) => acc += v.unreadMessages, 0);
}

function unreadDms(dms: RawEvent[], myPubKey: HexKey, pk: HexKey) {
    if (pk === myPubKey) return 0;
    let lastRead = lastReadDm(pk);
    return dmsInChat(dms, pk).filter(a => a.created_at >= lastRead && a.pubkey !== myPubKey).length;
}

function newestMessage(dms: RawEvent[], myPubKey: HexKey, pk: HexKey) {
    if(pk === myPubKey) {
        return dmsInChat(dms.filter(d => isToSelf(d, myPubKey)), pk).reduce((acc, v) => acc = v.created_at > acc ? v.created_at : acc, 0);
    }

    return dmsInChat(dms, pk).reduce((acc, v) => acc = v.created_at > acc ? v.created_at : acc, 0);
}

export function extractChats(dms: RawEvent[], myPubKey: HexKey) {
    const keys = dms.map(a => [a.pubkey, dmTo(a)]).flat();
    const filteredKeys = Array.from(new Set<string>(keys));
    return filteredKeys.map(a => {
        return {
            pubkey: a,
            unreadMessages: unreadDms(dms, myPubKey, a),
            newestMessage: newestMessage(dms, myPubKey, a)
        } as DmChat;
    })
}