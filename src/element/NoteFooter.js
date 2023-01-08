import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { faHeart, faReply, faThumbsDown, faTrash, faBolt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import useEventPublisher from "../feed/EventPublisher";
import { normalizeReaction, Reaction } from "../Util";
import { NoteCreator } from "./NoteCreator";
import LNURLTip from "./LNURLTip";

export default function NoteFooter(props) {
    const reactions = props.reactions;
    const ev = props.ev;

    const login = useSelector(s => s.login.publicKey);
    const author = useSelector(s => s.users.users[ev.RootPubKey]);
    const publisher = useEventPublisher();
    const [reply, setReply] = useState(false);
    const [tip, setTip] = useState(false);
    const isMine = ev.RootPubKey === login;

    const groupReactions = useMemo(() => {
        return reactions?.reduce((acc, { content }) => {
            let r = normalizeReaction(content ?? "");
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

    function reactionIcon(content) {
        switch (content) {
            case Reaction.Positive: {
                return <FontAwesomeIcon color={hasReacted(content) ? "red" : "currentColor"} icon={faHeart} />;
            }
            case Reaction.Negative: {
                return <FontAwesomeIcon color={hasReacted(content) ? "orange" : "currentColor"} icon={faThumbsDown} />;
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
                <span className="pill" onClick={(e) => setReply(s => !s)}>
                    <FontAwesomeIcon icon={faReply} />
                </span>
                {Object.keys(groupReactions).map((emoji) => {
                    return (
                        <span className="pill" onClick={() => react(emoji)} key={emoji}>
                            {reactionIcon(emoji)}
                            {groupReactions[emoji] ? <>&nbsp;{groupReactions[emoji]}</> : null}
                        </span>
                    )
                })}
            </div>
            <NoteCreator replyTo={ev} onSend={(e) => setReply(false)} show={reply} />
            <LNURLTip svc={author?.lud16 || author?.lud06} onClose={(e) => setTip(false)} show={tip} />
        </>
    )
}