import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { faHeart, faReply, faThumbsDown, faTrash, faBolt, faRepeat } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { ZapsSummary, parseZap } from "./Zap";
import { formatShort } from "../Number";
import useEventPublisher from "../feed/EventPublisher";
import { getReactions, normalizeReaction, Reaction } from "../Util";
import { NoteCreator } from "./NoteCreator";
import LNURLTip from "./LNURLTip";
import useProfile from "../feed/ProfileFeed";
import { default as NEvent } from "../nostr/Event";
import { RootState } from "../state/Store";
import { HexKey, TaggedRawEvent } from "../nostr";
import EventKind from "../nostr/EventKind";

export interface NoteFooterProps {
    related: TaggedRawEvent[],
    ev: NEvent
}

export default function NoteFooter(props: NoteFooterProps) {
    const { related, ev } = props;

    const login = useSelector<RootState, HexKey | undefined>(s => s.login.publicKey);
    const author = useProfile(ev.RootPubKey)?.get(ev.RootPubKey);
    const publisher = useEventPublisher();
    const [reply, setReply] = useState(false);
    const [tip, setTip] = useState(false);
    const isMine = ev.RootPubKey === login;
    const reactions = useMemo(() => getReactions(related, ev.Id, EventKind.Reaction), [related]);
    const reposts = useMemo(() => getReactions(related, ev.Id, EventKind.Repost), [related]);
    const zaps = useMemo(() => getReactions(related, ev.Id, EventKind.Zap).map(parseZap).filter(z => z.valid), [related]);
    const zapTotal = zaps.reduce((acc, z) => acc + z.amount, 0)

    const groupReactions = useMemo(() => {
        return reactions?.reduce((acc, { content }) => {
            let r = normalizeReaction(content);
            const amount = acc[r] || 0
            return { ...acc, [r]: amount + 1 }
        }, {
            [Reaction.Positive]: 0,
            [Reaction.Negative]: 0
        });
    }, [reactions]);

    function hasReacted(emoji: string) {
        return reactions?.some(({ pubkey, content }) => normalizeReaction(content) === emoji && pubkey === login)
    }

    function hasReposted() {
        return reposts.some(a => a.pubkey === login);
    }

    async function react(content: string) {
        let evLike = await publisher.react(ev, content);
        publisher.broadcast(evLike);
    }

    async function deleteEvent() {
        if (window.confirm(`Are you sure you want to delete ${ev.Id.substring(0, 8)}?`)) {
            let evDelete = await publisher.delete(ev.Id);
            publisher.broadcast(evDelete);
        }
    }

    async function repost() {
        if (!hasReposted()) {
            let evRepost = await publisher.repost(ev);
            publisher.broadcast(evRepost);
        }
    }

    function tipButton() {
        let service = author?.lud16 || author?.lud06;
        if (service) {
            return (
                <>
                    <span className="pill" onClick={(e) => setTip(true)}>
                        <FontAwesomeIcon color={zapTotal ? "var(--yellow)" : "var(--font-color)"} icon={faBolt} />
                        {zapTotal > 0 && ` ${formatShort(zapTotal)}`}
                    </span>
                </>
            )
        }
        return null;
    }

    function reactionIcon(content: string, reacted: boolean) {
        switch (content) {
            case Reaction.Positive: {
                return <FontAwesomeIcon color={reacted ? "red" : "currentColor"} icon={faHeart} />;
            }
            case Reaction.Negative: {
                return <FontAwesomeIcon color={reacted ? "orange" : "currentColor"} icon={faThumbsDown} />;
            }
        }
        return content;
    }

    return (
        <>
            <div className="footer">
                {isMine ? <span className="pill">
                    <FontAwesomeIcon icon={faTrash} onClick={(e) => deleteEvent()} />
                </span> : null}
                {tipButton()}
                <span className="pill" onClick={() => repost()}>
                    <FontAwesomeIcon icon={faRepeat} color={hasReposted() ? "green" : "currenColor"} />
                    {reposts.length > 0 ? <>&nbsp;{reposts.length}</> : null}
                </span>
                <span className="pill" onClick={(e) => setReply(s => !s)}>
                    <FontAwesomeIcon icon={faReply} />
                </span>
                {Object.keys(groupReactions || {}).map((emoji) => {
                    let didReact = hasReacted(emoji);
                    return (
                        <span className="pill" onClick={() => {
                            if (!didReact) {
                                react(emoji);
                            }
                        }} key={emoji}>
                            {reactionIcon(emoji, didReact)}
                            {groupReactions[emoji] ? <>&nbsp;{groupReactions[emoji]}</> : null}
                        </span>
                    )
                })}
            </div>
            <ZapsSummary zaps={zaps} />
            <NoteCreator
                autoFocus={true}
                replyTo={ev}
                onSend={() => setReply(false)}
                show={reply}
            />
            <LNURLTip
              svc={author?.lud16 || author?.lud06}
              onClose={() => setTip(false)}
              show={tip}
              note={ev.Id}
              author={ev.PubKey}
            />
        </>
    )
}
