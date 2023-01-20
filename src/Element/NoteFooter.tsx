import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { faHeart, faReply, faThumbsDown, faTrash, faBolt, faRepeat } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { formatShort } from "Number";
import useEventPublisher from "Feed/EventPublisher";
import { getReactions, normalizeReaction, Reaction } from "Util";
import { NoteCreator } from "Element/NoteCreator";
import LNURLTip from "Element/LNURLTip";
import useProfile from "Feed/ProfileFeed";
import { default as NEvent } from "Nostr/Event";
import { RootState } from "State/Store";
import { HexKey, TaggedRawEvent } from "Nostr";
import EventKind from "Nostr/EventKind";

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
      if (!hasReacted(content)) {
        let evLike = await publisher.react(ev, content);
        publisher.broadcast(evLike);
      }
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
                    <div className="reaction-pill" onClick={(e) => setTip(true)}>
                        <div className="reaction-pill-icon">
                          <FontAwesomeIcon icon={faBolt} />
                        </div>
                    </div>
                </>
            )
        }
        return null;
    }

    function reactionIcon(content: string, reacted: boolean) {
        switch (content) {
            case Reaction.Positive: {
                return <FontAwesomeIcon icon={faHeart} />;
            }
            case Reaction.Negative: {
                return <FontAwesomeIcon icon={faThumbsDown} />;
            }
        }
        return content;
    }

    function repostIcon() {
      return (
          <div className={`reaction-pill ${hasReposted() ? 'reacted' : ''}`} onClick={() => repost()}>
            <div className="reaction-pill-icon">
              <FontAwesomeIcon icon={faRepeat} />
            </div>
            {reposts.length > 0 && (
              <div className="reaction-pill-number">
                {formatShort(reposts.length)}
              </div>
            )}
          </div>
      )
    }


    return (
        <>
            <div className="footer">
                <div className={`reaction-pill ${reply ? 'reacted' : ''}`} onClick={(e) => setReply(s => !s)}>
                  <div className="reaction-pill-icon">
                    <FontAwesomeIcon icon={faReply} />
                  </div>
                </div>
                <div className={`reaction-pill ${hasReacted('+') ? 'reacted' : ''} `} onClick={(e) => react("+")}>
                  <div className="reaction-pill-icon">
                    <FontAwesomeIcon icon={faHeart} />
                  </div>
                  <div className="reaction-pill-number">
                    {formatShort(groupReactions[Reaction.Positive])}
                  </div>
                </div>
                <div className={`reaction-pill ${hasReacted('-') ? 'reacted' : ''}`} onClick={(e) => react("-")}>
                  <div className="reaction-pill-icon">
                    <FontAwesomeIcon icon={faThumbsDown} />
                  </div>
                  <div className="reaction-pill-number">
                    {formatShort(groupReactions[Reaction.Negative])}
                  </div>
                </div>
                {repostIcon()}
                {tipButton()}
                {isMine && (
                  <div className="reaction-pill trash-icon">
                    <div className="reaction-pill-icon">
                      <FontAwesomeIcon icon={faTrash} onClick={(e) => deleteEvent()} />
                    </div>
                  </div>
                )}
            </div>
            <NoteCreator
                autoFocus={true}
                replyTo={ev}
                onSend={() => setReply(false)}
                show={reply}
            />
            <LNURLTip svc={author?.lud16 || author?.lud06} onClose={() => setTip(false)} show={tip} />
        </>
    )
}
