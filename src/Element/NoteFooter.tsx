import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { faTrash, faRepeat, faShareNodes, faCopy, faCommentSlash, faBan, faLanguage } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Menu, MenuItem } from '@szhsin/react-menu';

import Dislike from "Icons/Dislike";
import Heart from "Icons/Heart";
import Dots from "Icons/Dots";
import Zap from "Icons/Zap";
import Reply from "Icons/Reply";
import { formatShort } from "Number";
import useEventPublisher from "Feed/EventPublisher";
import { getReactions, hexToBech32, normalizeReaction, Reaction } from "Util";
import { NoteCreator } from "Element/NoteCreator";
import SendSats from "Element/SendSats";
import { parseZap, ZapsSummary } from "Element/Zap";
import { useUserProfile } from "Feed/ProfileFeed";
import { default as NEvent } from "Nostr/Event";
import { RootState } from "State/Store";
import { HexKey, TaggedRawEvent } from "Nostr";
import EventKind from "Nostr/EventKind";
import { UserPreferences } from "State/Login";
import useModeration from "Hooks/useModeration";
import { TranslateHost } from "Const";

export interface Translation {
  text: string,
  fromLanguage: string,
  confidence: number
}

export interface NoteFooterProps {
  related: TaggedRawEvent[],
  ev: NEvent,
  onTranslated?: (content: Translation) => void
}

export default function NoteFooter(props: NoteFooterProps) {
  const { related, ev } = props;

  const login = useSelector<RootState, HexKey | undefined>(s => s.login.publicKey);
  const { mute, block } = useModeration();
  const prefs = useSelector<RootState, UserPreferences>(s => s.login.preferences);
  const author = useUserProfile(ev.RootPubKey);
  const publisher = useEventPublisher();
  const [reply, setReply] = useState(false);
  const [tip, setTip] = useState(false);
  const isMine = ev.RootPubKey === login;
  const lang = window.navigator.language;
  const langNames = new Intl.DisplayNames([...window.navigator.languages], { type: "language" });
  const reactions = useMemo(() => getReactions(related, ev.Id, EventKind.Reaction), [related, ev]);
  const reposts = useMemo(() => getReactions(related, ev.Id, EventKind.Repost), [related, ev]);
  const zaps = useMemo(() =>
    getReactions(related, ev.Id, EventKind.ZapReceipt).map(parseZap).filter(z => z.valid && z.zapper !== ev.PubKey),
    [related]
  );
  const zapTotal = zaps.reduce((acc, z) => acc + z.amount, 0)
  const didZap = zaps.some(a => a.zapper === login);
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
          <div className={`reaction-pill ${didZap ? 'reacted' : ''}`} onClick={() => setTip(true)}>
            <div className="reaction-pill-icon">
              <Zap />
            </div>
            {zapTotal > 0 && (<div className="reaction-pill-number">{formatShort(zapTotal)}</div>)}
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
            <Heart />
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

  async function translate() {
    const res = await fetch(`${TranslateHost}/translate`, {
      method: "POST",
      body: JSON.stringify({
        q: ev.Content,
        source: "auto",
        target: lang.split("-")[0],
      }),
      headers: { "Content-Type": "application/json" }
    });

    if (res.ok) {
      let result = await res.json();
      if (typeof props.onTranslated === "function" && result) {
        props.onTranslated({
          text: result.translatedText,
          fromLanguage: langNames.of(result.detectedLanguage.language),
          confidence: result.detectedLanguage.confidence
        } as Translation);
      }
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
        {prefs.enableReactions && (
          <MenuItem onClick={() => react("-")}>
            <Dislike />
            {formatShort(groupReactions[Reaction.Negative])}
            &nbsp;
            Dislike
          </MenuItem>
        )}
        <MenuItem onClick={() => share()}>
          <FontAwesomeIcon icon={faShareNodes} />
          Share
        </MenuItem>
        <MenuItem onClick={() => copyId()}>
          <FontAwesomeIcon icon={faCopy} />
          Copy ID
        </MenuItem>
        <MenuItem onClick={() => mute(ev.PubKey)}>
          <FontAwesomeIcon icon={faCommentSlash} />
          Mute
        </MenuItem>
        <MenuItem onClick={() => block(ev.PubKey)}>
          <FontAwesomeIcon icon={faBan} />
          Block
        </MenuItem>
        <MenuItem onClick={() => translate()}>
          <FontAwesomeIcon icon={faLanguage} />
          Translate to {langNames.of(lang.split("-")[0])}
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
      <div className="footer-reactions">
        {tipButton()}
        {reactionIcons()}
        <div className={`reaction-pill ${reply ? 'reacted' : ''}`} onClick={(e) => setReply(s => !s)}>
          <div className="reaction-pill-icon">
            <Reply />
          </div>
        </div>
        <Menu menuButton={<div className="reaction-pill">
          <div className="reaction-pill-icon">
            <Dots />
          </div>
        </div>}
          menuClassName="ctx-menu"
        >
          {menuItems()}
        </Menu>
      </div>
      <NoteCreator
        autoFocus={true}
        replyTo={ev}
        onSend={() => setReply(false)}
        show={reply}
        setShow={setReply}
      />
      <SendSats
        svc={author?.lud16 || author?.lud06}
        onClose={() => setTip(false)}
        show={tip}
        author={author?.pubkey}
        target={author?.display_name || author?.name}
        note={ev.Id}
      />
    </div>
    <div className="zaps-container">
     <ZapsSummary zaps={zaps} />
    </div>
    </>
  )
}
