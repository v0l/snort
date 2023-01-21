import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { faHeart, faReply, faThumbsDown, faTrash, faBolt, faRepeat, faEllipsisVertical, faShareNodes, faCopy } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Menu, MenuItem } from '@szhsin/react-menu';

import { formatShort } from "Number";
import useEventPublisher from "Feed/EventPublisher";
import { getReactions, hexToBech32, normalizeReaction, Reaction } from "Util";
import { NoteCreator } from "Element/NoteCreator";
import LNURLTip from "Element/LNURLTip";
import useProfile from "Feed/ProfileFeed";
import { default as NEvent } from "Nostr/Event";
import { RootState } from "State/Store";
import { HexKey, TaggedRawEvent } from "Nostr";
import EventKind from "Nostr/EventKind";
import { UserPreferences } from "State/Login";

export interface NoteFooterProps {
  related: TaggedRawEvent[],
  ev: NEvent
}

export default function NoteFooter(props: NoteFooterProps) {
  const { related, ev } = props;

  const login = useSelector<RootState, HexKey | undefined>(s => s.login.publicKey);
  const prefs = useSelector<RootState, UserPreferences>(s => s.login.preferences);
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
      if (!prefs.confirmReposts || window.confirm(`Are you sure you want to repost: ${ev.Id}`)) {
        let evRepost = await publisher.repost(ev);
        publisher.broadcast(evRepost);
      }
    }
  }

  function tipButton() {
    let service = author?.lud16 || author?.lud06;
    if (service) {
      return (
        <>
          <div className="reaction-pill" onClick={() => setTip(true)}>
            <div className="reaction-pill-icon">
              <FontAwesomeIcon icon={faBolt} />
            </div>
          </div>
        </>
      )
    }
    return null;
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

  function reactionIcons() {
    if (!prefs.enableReactions) {
      return null;
    }
    return (
      <>
        <div className={`reaction-pill ${hasReacted('+') ? 'reacted' : ''} `} onClick={() => react("+")}>
          <div className="reaction-pill-icon">
            <FontAwesomeIcon icon={faHeart} />
          </div>
          <div className="reaction-pill-number">
            {formatShort(groupReactions[Reaction.Positive])}
          </div>
        </div>
        {repostIcon()}
      </>
    )
  }

  async function share() {
    const url = `${window.location.protocol}//${window.location.host}/e/${hexToBech32("note", ev.Id)}`;
    if ("share" in window.navigator) {
      await window.navigator.share({
        title: "Snort",
        url: url
      });
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  async function copyId() {
    await navigator.clipboard.writeText(hexToBech32("note", ev.Id));
  }

  async function copyEvent() {
    await navigator.clipboard.writeText(JSON.stringify(ev.Original, undefined, '  '));
  }

  function menuItems() {
    return (
      <>
        <MenuItem onClick={() => react("-")}>
          <div>
            <FontAwesomeIcon icon={faThumbsDown} className={hasReacted('-') ? 'reacted' : ''} />
            &nbsp;
            {formatShort(groupReactions[Reaction.Negative])}
          </div>
          Dislike
        </MenuItem>
        <MenuItem onClick={() => share()}>
          <FontAwesomeIcon icon={faShareNodes} />
          Share
        </MenuItem>
        <MenuItem onClick={() => copyId()}>
          <FontAwesomeIcon icon={faCopy} />
          Copy ID
        </MenuItem>
        {prefs.showDebugMenus && (
          <MenuItem onClick={() => copyEvent()}>
            <FontAwesomeIcon icon={faCopy} />
            Copy Event JSON
          </MenuItem>
        )}
        {isMine && (
          <MenuItem onClick={() => deleteEvent()}>
            <FontAwesomeIcon icon={faTrash} className="red" />
            Delete
          </MenuItem>
        )}
      </>
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
        <Menu menuButton={<div className="reaction-pill">
          <div className="reaction-pill-icon">
            <FontAwesomeIcon icon={faEllipsisVertical} />
          </div>
        </div>} menuClassName="ctx-menu">
          {menuItems()}
        </Menu>

        {reactionIcons()}
        {tipButton()}
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
