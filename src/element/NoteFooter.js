import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { faHeart, faReply, faThumbsDown, faTrash, faBolt, faRepeat } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import useEventPublisher from "../feed/EventPublisher";
import { normalizeReaction, Reaction } from "../Util";
import { NoteCreator } from "./NoteCreator";
import LNURLTip from "./LNURLTip";
import useProfile from "../feed/ProfileFeed";

export default function NoteFooter(props) {
    const reactions = props.reactions;
    const ev = props.ev;

    const login = useSelector(s => s.login.publicKey);
    const author = useProfile(ev.RootPubKey);
    const publisher = useEventPublisher();
    const [reply, setReply] = useState(false);
    const [tip, setTip] = useState(false);
    const isMine = ev.RootPubKey === login;

    const groupReactions = useMemo(() => {
        return reactions?.reduce((acc, { Content }) => {
            let r = normalizeReaction(Content ?? "");
            const amount = acc[r] || 0
            return { ...acc, [r]: amount + 1 }
        }, {
            [Reaction.Positive]: 0,
            [Reaction.Negative]: 0
        });
    }, [reactions]);

    function hasReacted(emoji) {
        return reactions?.find(({ PubKey, Content }) => Content === emoji && PubKey === login)
    }

    async function react(content) {
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
        let evRepost = await publisher.repost(ev);
        publisher.broadcast(evRepost);
    }

    function tipButton() {
        let service = author?.lud16 || author?.lud06;
        if (service) {
            return (
                <>
                    <span className="pill" onClick={(e) => setTip(true)}>
                        <FontAwesomeIcon icon={faBolt} />
                    </span>
                </>
            )
        }
        return null;
    }

    function reactionIcon(content, reacted) {
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
                    <FontAwesomeIcon icon={faRepeat} />
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
            <NoteCreator
                autoFocus={true}
                replyTo={ev}
                onSend={(e) => setReply(false)}
                show={reply}
            />
            <LNURLTip svc={author?.lud16 || author?.lud06} onClose={(e) => setTip(false)} show={tip} />
        </>
    )
}
