import "./Note.css";
import { useCallback, useState } from "react";
import { useSelector } from "react-redux";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import { faHeart, faReply, faThumbsDown, faTrash, faBolt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import Event from "../nostr/Event";
import ProfileImage from "./ProfileImage";
import useEventPublisher from "../feed/EventPublisher";
import { NoteCreator } from "./NoteCreator";
import { extractLinks, extractMentions, extractInvoices } from "../Text";
import { eventLink } from "../Util";
import LNURLTip from "./LNURLTip";

export default function Note(props) {
    const navigate = useNavigate();
    const data = props.data;
    const opt = props.options;
    const dataEvent = props["data-ev"];
    const reactions = props.reactions;
    const deletion = props.deletion;
    const emojiReactions = reactions?.filter(({ Content }) => Content && Content !== "+" && Content !== "-" && Content !== "❤️")
      .reduce((acc, { Content }) => {
          const amount = acc[Content] || 0
          return {...acc, [Content]: amount + 1 }
      }, {})
    const likes = reactions?.filter(({ Content }) => Content === "+" || Content === "❤️").length ?? 0
    const dislikes = reactions?.filter(({ Content }) => Content === "-").length ?? 0
    const publisher = useEventPublisher();
    const [reply, setReply] = useState(false);
    const [tip, setTip] = useState(false);
    const users = useSelector(s => s.users?.users);
    const login = useSelector(s => s.login.publicKey);
    const ev = dataEvent ?? Event.FromObject(data);
    const isMine = ev.PubKey === login;
    const liked = reactions?.find(({ PubKey, Content }) => Content === "+" && PubKey === login)
    const disliked = reactions?.find(({ PubKey, Content }) => Content === "-" && PubKey === login)
    const author = users[ev.PubKey];

    const options = {
        showHeader: true,
        showTime: true,
        showFooter: true,
        ...opt
    };

    function hasReacted(emoji) {
      return reactions?.find(({ PubKey, Content }) => Content === emoji && PubKey === login)
    }

    const transformBody = useCallback(() => {
        let body = ev?.Content ?? "";

        let fragments = extractLinks([body]);
        fragments = extractMentions(fragments, ev.Tags, users);
        fragments = extractInvoices(fragments);
        if (deletion?.length > 0) {
            return (
                <>
                    <b className="error">Deleted</b>
                </>
            );
        }
        return fragments;
    }, [data, dataEvent, reactions, deletion]);

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

        let replyId = ev.Thread?.ReplyTo?.Event;
        let mentions = ev.Thread?.PubKeys?.map(a => [a, users[a]])?.map(a => a[1]?.name ?? a[0].substring(0, 8));
        return (
            <div className="reply" onClick={(e) => goToEvent(e, replyId)}>
                ➡️ {mentions?.join(", ") ?? replyId?.substring(0, 8)}
            </div>
        )
    }

    async function react(emoji) {
        let evLike = await publisher.like(ev, emoji);
        publisher.broadcast(evLike);
    }

    async function like() {
        let evLike = await publisher.like(ev);
        publisher.broadcast(evLike);
    }

    async function dislike() {
        let evLike = await publisher.dislike(ev);
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

    if (!ev.IsContent()) {
        return (
            <>
                <pre>{ev.Id}</pre>
                <pre>Kind: {ev.Kind}</pre>
                <pre>Content: {ev.Content}</pre>
            </>
        );
    }

    return (
        <div className="note">
            {options.showHeader ?
                <div className="header flex">
                    <ProfileImage pubkey={ev.PubKey} subHeader={replyTag()} />
                    {options.showTime ?
                        <div className="info">
                            {moment(ev.CreatedAt * 1000).fromNow()}
                        </div> : null}
                </div> : null}
            <div className="body" onClick={(e) => goToEvent(e, ev.Id)}>
                {transformBody()}
            </div>
            {options.showFooter ?
                <div className="footer">
                    {isMine ? <span className="pill">
                        <FontAwesomeIcon icon={faTrash} onClick={(e) => deleteEvent()} />
                    </span> : null}
                    {tipButton()}
                    <span className="pill" onClick={(e) => setReply(s => !s)}>
                        <FontAwesomeIcon icon={faReply} />
                    </span>
                    {Object.keys(emojiReactions).map((emoji) => {
                      return (
                          <span className="pill" onClick={() => react(emoji)}>
                            <span style={{ filter: hasReacted(emoji) ? 'none' : 'grayscale(1)' }}>
                                {emoji}
                            </span>
                            &nbsp;
                            {emojiReactions[emoji]}
                          </span>
                      )
                    })}
                    <span className="pill" onClick={() => like()}>
                        <FontAwesomeIcon color={liked ? "red" : "currentColor"} icon={faHeart} /> &nbsp;
                        {likes}
                    </span>
                    <span className="pill" onClick={() => dislike()}>
                        <FontAwesomeIcon color={disliked ? "orange" : "currentColor"} icon={faThumbsDown} /> &nbsp;
                        {dislikes}
                    </span>
                </div> : null}
            <NoteCreator replyTo={ev} onSend={(e) => setReply(false)} show={reply} />
            <LNURLTip svc={author?.lud16 || author?.lud06} onClose={(e) => setTip(false)} show={tip} />
        </div>
    )
}