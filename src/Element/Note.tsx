import "./Note.css";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { default as NEvent } from "Nostr/Event";
import ProfileImage from "Element/ProfileImage";
import Text from "Element/Text";
import { eventLink, getReactions, hexToBech32 } from "Util";
import NoteFooter from "Element/NoteFooter";
import NoteTime from "Element/NoteTime";
import EventKind from "Nostr/EventKind";
import { useUserProfiles } from "Feed/ProfileFeed";
import { TaggedRawEvent, u256 } from "Nostr";
import { useInView } from "react-intersection-observer";

export interface NoteProps {
    data?: TaggedRawEvent,
    isThread?: boolean,
    related: TaggedRawEvent[],
    highlight?: boolean,
    options?: {
        showHeader?: boolean,
        showTime?: boolean,
        showFooter?: boolean
    },
    ["data-ev"]?: NEvent
}

export default function Note(props: NoteProps) {
    const navigate = useNavigate();
    const { data, isThread, related, highlight, options: opt, ["data-ev"]: parsedEvent } = props
    const ev = useMemo(() => parsedEvent ?? new NEvent(data), [data]);
    const pubKeys = useMemo(() => ev.Thread?.PubKeys || [], [ev]);
    const users = useUserProfiles(pubKeys);
    const deletions = useMemo(() => getReactions(related, ev.Id, EventKind.Deletion), [related]);
    const { ref, inView, entry } = useInView({ triggerOnce: true });
    const [extendable, setExtendable] = useState<boolean>(false);
    const [showMore, setShowMore] = useState<boolean>(false);

    const [scrolled, setScrolled] = useState<boolean>(false);

    useEffect(() => {
        if (highlight) scrollToNote();
    })

    const options = {
        showHeader: true,
        showTime: true,
        showFooter: true,
        ...opt
    };

    const transformBody = useCallback(() => {
        let body = ev?.Content ?? "";
        if (deletions?.length > 0) {
            return (<b className="error">Deleted</b>);
        }
        return <Text content={body} tags={ev.Tags} users={users || new Map()} />;
    }, [ev]);

    useLayoutEffect(() => {
        if (entry && inView && extendable === false) {
            let h = entry?.target.clientHeight ?? 0;
            if (h > 650) {
                setExtendable(true);
            }
        }
    }, [inView, entry, extendable]);

    function goToEvent(e: any, id: u256) {
        if (!window.location.pathname.startsWith("/e/")) {
            e.stopPropagation();
            navigate(eventLink(id));
        }
    }

    const scrollToNote= () => {
        const element = document.getElementById(ev.Id);
        if (element && !scrolled) {
            setScrolled(true);
            element.scrollIntoView();
        }
      };

    function replyTag() {
        if (ev.Thread === null) {
            return null;
        }

        const maxMentions = 2;
        let replyId = ev.Thread?.ReplyTo?.Event ?? ev.Thread?.Root?.Event;
        let mentions: string[] = [];
        for (let pk of ev.Thread?.PubKeys) {
            let u = users?.get(pk);
            if (u) {
                mentions.push(u.name ?? hexToBech32("npub", pk).substring(0, 12));
            } else {
                mentions.push(hexToBech32("npub", pk).substring(0, 12));
            }
        }
        mentions.sort((a, b) => a.startsWith("npub") ? 1 : -1);
        let othersLength = mentions.length - maxMentions
        let pubMentions = mentions.length > maxMentions ? `${mentions?.slice(0, maxMentions).join(", ")} & ${othersLength} other${othersLength > 1 ? 's' : ''}` : mentions?.join(", ");
        return (
            <div className="reply">
                {(pubMentions?.length ?? 0) > 0 ? pubMentions : replyId ? hexToBech32("note", replyId)?.substring(0, 12) : ""}
            </div>
        )
    }

    if (ev.Kind !== EventKind.TextNote) {
        return (
            <>
                <h4>Unknown event kind: {ev.Kind}</h4>
                <pre>
                    {JSON.stringify(ev.ToObject(), undefined, '  ')}
                </pre>
            </>
        );
    }

    function content() {
        if (!inView) return null;
        return (
            <>
                {options.showHeader ?
                    <div className="header flex">
                        <ProfileImage pubkey={ev.RootPubKey} subHeader={replyTag() ?? undefined} />
                        {options.showTime ?
                            <div className="info">
                                <NoteTime from={ev.CreatedAt * 1000} />
                            </div> : null}
                    </div> : null}
                <div className="body" onClick={(e) => goToEvent(e, ev.Id)}>
                    {transformBody()}
                </div>
                {extendable && !showMore && (<div className="flex f-center">
                    <button className="btn mt10" onClick={() => setShowMore(true)}>Show more</button>
                </div>)}
                {options.showFooter ? <NoteFooter ev={ev} related={related} /> : null}
            </>
        )
    }

    return (
        <div id={ev.Id} className={`note card${highlight ? " active" : ""}${isThread ? " thread" : ""}${extendable && !showMore ? " note-expand" : ""}`}
            ref={ref} >
            {content()}
        </div>
    )
}
