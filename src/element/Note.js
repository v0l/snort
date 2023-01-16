import "./Note.css";
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import Event from "../nostr/Event";
import ProfileImage from "./ProfileImage";
import Text from "./Text";
import { eventLink, hexToBech32 } from "../Util";
import NoteFooter from "./NoteFooter";
import NoteTime from "./NoteTime";
import EventKind from "../nostr/EventKind";
import useProfile from "../feed/ProfileFeed";

export default function Note(props) {
    const navigate = useNavigate();
    const { data, isThread, reactions, deletion, hightlight, options: opt, ["data-ev"]: parsedEvent } = props
    const ev = useMemo(() => parsedEvent ?? new Event(data), [data]);
    const pubKeys = useMemo(() => ev.Thread?.PubKeys || [], [ev]);

    const users = useProfile(pubKeys);

    const options = {
        showHeader: true,
        showTime: true,
        showFooter: true,
        ...opt
    };

    const transformBody = useCallback(() => {
        let body = ev?.Content ?? "";
        if (deletion?.length > 0) {
            return (<b className="error">Deleted</b>);
        }
        return <Text content={body} tags={ev.Tags} users={users || []} />;
    }, [props]);

    function goToEvent(e, id) {
        if (!window.location.pathname.startsWith("/e/")) {
            e.stopPropagation();
            navigate(eventLink(id));
        }
    }

    function replyTag() {
        if (ev.Thread === null) {
            return null;
        }

        const maxMentions = 2;
        let replyId = ev.Thread?.ReplyTo?.Event ?? ev.Thread?.Root?.Event;
        let mentions = ev.Thread?.PubKeys?.map(a => [a, users ? users[a] : null])?.map(a => (a[1]?.name?.length ?? 0) > 0 ? a[1].name : hexToBech32("npub", a[0]).substring(0, 12))
            .sort((a, b) => a.startsWith("npub") ? 1 : -1);
        let othersLength = mentions.length - maxMentions
        let pubMentions = mentions.length > maxMentions ? `${mentions?.slice(0, maxMentions).join(", ")} & ${othersLength} other${othersLength > 1 ? 's' : ''}` : mentions?.join(", ");
        return (
            <div className="reply">
                ➡️ {(pubMentions?.length ?? 0) > 0 ? pubMentions : hexToBech32("note", replyId)?.substring(0, 12)}
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

    return (
        <div className={`note ${hightlight ? "active" : ""} ${isThread ? "thread" : ""}`}>
            {options.showHeader ?
                <div className="header flex">
                    <ProfileImage pubkey={ev.RootPubKey} subHeader={replyTag()} />
                    {options.showTime ?
                        <div className="info">
                            <NoteTime from={ev.CreatedAt * 1000} />
                        </div> : null}
                </div> : null}
            <div className="body" onClick={(e) => goToEvent(e, ev.Id)}>
                {transformBody()}
            </div>
            {options.showFooter ? <NoteFooter ev={ev} reactions={reactions} /> : null}
        </div>
    )
}
