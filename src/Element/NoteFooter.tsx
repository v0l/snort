import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useIntl, FormattedMessage } from "react-intl";
import {
  faTrash,
  faHeart,
  faRepeat,
  faShareNodes,
  faCopy,
  faCommentSlash,
  faBan,
  faLanguage,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Menu, MenuItem } from "@szhsin/react-menu";

import Dislike from "Icons/Dislike";
import Heart from "Icons/Heart";
import Dots from "Icons/Dots";
import Zap from "Icons/Zap";
import Reply from "Icons/Reply";
import { formatShort } from "Number";
import useEventPublisher from "Feed/EventPublisher";
import { getReactions, dedupeByPubkey, hexToBech32, normalizeReaction, Reaction } from "Util";
import { NoteCreator } from "Element/NoteCreator";
import Reactions from "Element/Reactions";
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

import messages from "./messages";

export interface Translation {
  text: string;
  fromLanguage: string;
  confidence: number;
}

export interface NoteFooterProps {
  related: TaggedRawEvent[];
  ev: NEvent;
  onTranslated?: (content: Translation) => void;
}

export default function NoteFooter(props: NoteFooterProps) {
  const { related, ev } = props;
  const { formatMessage } = useIntl();
  const login = useSelector<RootState, HexKey | undefined>(s => s.login.publicKey);
  const { mute, block } = useModeration();
  const prefs = useSelector<RootState, UserPreferences>(s => s.login.preferences);
  const author = useUserProfile(ev.RootPubKey);
  const publisher = useEventPublisher();
  const [reply, setReply] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [tip, setTip] = useState(false);
  const isMine = ev.RootPubKey === login;
  const lang = window.navigator.language;
  const langNames = new Intl.DisplayNames([...window.navigator.languages], {
    type: "language",
  });
  const reactions = useMemo(() => getReactions(related, ev.Id, EventKind.Reaction), [related, ev]);
  const reposts = useMemo(() => dedupeByPubkey(getReactions(related, ev.Id, EventKind.Repost)), [related, ev]);
  const zaps = useMemo(() => {
    const sortedZaps = getReactions(related, ev.Id, EventKind.ZapReceipt)
      .map(parseZap)
      .filter(z => z.valid && z.zapper !== ev.PubKey);
    sortedZaps.sort((a, b) => b.amount - a.amount);
    return sortedZaps;
  }, [related]);
  const zapTotal = zaps.reduce((acc, z) => acc + z.amount, 0);
  const didZap = zaps.some(a => a.zapper === login);
  const groupReactions = useMemo(() => {
    const result = reactions?.reduce(
      (acc, reaction) => {
        const kind = normalizeReaction(reaction.content);
        const rs = acc[kind] || [];
        if (rs.map(e => e.pubkey).includes(reaction.pubkey)) {
          return acc;
        }
        return { ...acc, [kind]: [...rs, reaction] };
      },
      {
        [Reaction.Positive]: [] as TaggedRawEvent[],
        [Reaction.Negative]: [] as TaggedRawEvent[],
      }
    );
    return {
      [Reaction.Positive]: dedupeByPubkey(result[Reaction.Positive]),
      [Reaction.Negative]: dedupeByPubkey(result[Reaction.Negative]),
    };
  }, [reactions]);
  const positive = groupReactions[Reaction.Positive];
  const negative = groupReactions[Reaction.Negative];

  function hasReacted(emoji: string) {
    return reactions?.some(({ pubkey, content }) => normalizeReaction(content) === emoji && pubkey === login);
  }

  function hasReposted() {
    return reposts.some(a => a.pubkey === login);
  }

  async function react(content: string) {
    if (!hasReacted(content)) {
      const evLike = await publisher.react(ev, content);
      publisher.broadcast(evLike);
    }
  }

  async function deleteEvent() {
    if (window.confirm(formatMessage(messages.ConfirmDeletion, { id: ev.Id.substring(0, 8) }))) {
      const evDelete = await publisher.delete(ev.Id);
      publisher.broadcast(evDelete);
    }
  }

  async function repost() {
    if (!hasReposted()) {
      if (!prefs.confirmReposts || window.confirm(formatMessage(messages.ConfirmRepost, { id: ev.Id }))) {
        const evRepost = await publisher.repost(ev);
        publisher.broadcast(evRepost);
      }
    }
  }

  function tipButton() {
    const service = author?.lud16 || author?.lud06;
    if (service) {
      return (
        <>
          <div className={`reaction-pill ${didZap ? "reacted" : ""}`} onClick={() => setTip(true)}>
            <div className="reaction-pill-icon">
              <Zap />
            </div>
            {zapTotal > 0 && <div className="reaction-pill-number">{formatShort(zapTotal)}</div>}
          </div>
        </>
      );
    }
    return null;
  }

  function repostIcon() {
    return (
      <div className={`reaction-pill ${hasReposted() ? "reacted" : ""}`} onClick={() => repost()}>
        <div className="reaction-pill-icon">
          <FontAwesomeIcon icon={faRepeat} />
        </div>
        {reposts.length > 0 && <div className="reaction-pill-number">{formatShort(reposts.length)}</div>}
      </div>
    );
  }

  function reactionIcons() {
    if (!prefs.enableReactions) {
      return null;
    }
    return (
      <>
        <div className={`reaction-pill ${hasReacted("+") ? "reacted" : ""} `} onClick={() => react("+")}>
          <div className="reaction-pill-icon">
            <Heart />
          </div>
          <div className="reaction-pill-number">{formatShort(positive.length)}</div>
        </div>
        {repostIcon()}
      </>
    );
  }

  async function share() {
    const url = `${window.location.protocol}//${window.location.host}/e/${hexToBech32("note", ev.Id)}`;
    if ("share" in window.navigator) {
      await window.navigator.share({
        title: "Snort",
        url: url,
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
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      const result = await res.json();
      if (typeof props.onTranslated === "function" && result) {
        props.onTranslated({
          text: result.translatedText,
          fromLanguage: langNames.of(result.detectedLanguage.language),
          confidence: result.detectedLanguage.confidence,
        } as Translation);
      }
    }
  }

  async function copyId() {
    await navigator.clipboard.writeText(hexToBech32("note", ev.Id));
  }

  async function copyEvent() {
    await navigator.clipboard.writeText(JSON.stringify(ev.Original, undefined, "  "));
  }

  function menuItems() {
    return (
      <>
        {prefs.enableReactions && (
          <MenuItem onClick={() => setShowReactions(true)}>
            <FontAwesomeIcon icon={faHeart} />
            <FormattedMessage {...messages.Reactions} />
          </MenuItem>
        )}
        <MenuItem onClick={() => share()}>
          <FontAwesomeIcon icon={faShareNodes} />
          <FormattedMessage {...messages.Share} />
        </MenuItem>
        <MenuItem onClick={() => copyId()}>
          <FontAwesomeIcon icon={faCopy} />
          <FormattedMessage {...messages.CopyID} />
        </MenuItem>
        <MenuItem onClick={() => mute(ev.PubKey)}>
          <FontAwesomeIcon icon={faCommentSlash} />
          <FormattedMessage {...messages.Mute} />
        </MenuItem>
        {prefs.enableReactions && (
          <MenuItem onClick={() => react("-")}>
            <Dislike />
            <FormattedMessage {...messages.Dislike} values={{ n: negative.length }} />
          </MenuItem>
        )}
        <MenuItem onClick={() => block(ev.PubKey)}>
          <FontAwesomeIcon icon={faBan} />
          <FormattedMessage {...messages.Block} />
        </MenuItem>
        <MenuItem onClick={() => translate()}>
          <FontAwesomeIcon icon={faLanguage} />
          <FormattedMessage {...messages.TranslateTo} values={{ lang: langNames.of(lang.split("-")[0]) }} />
        </MenuItem>
        {prefs.showDebugMenus && (
          <MenuItem onClick={() => copyEvent()}>
            <FontAwesomeIcon icon={faCopy} />
            <FormattedMessage {...messages.CopyJSON} />
          </MenuItem>
        )}
        {isMine && (
          <MenuItem onClick={() => deleteEvent()}>
            <FontAwesomeIcon icon={faTrash} className="red" />
            <FormattedMessage {...messages.Delete} />
          </MenuItem>
        )}
      </>
    );
  }

  return (
    <>
      <div className="footer">
        <div className="footer-reactions">
          {tipButton()}
          {reactionIcons()}
          <div className={`reaction-pill ${reply ? "reacted" : ""}`} onClick={() => setReply(s => !s)}>
            <div className="reaction-pill-icon">
              <Reply />
            </div>
          </div>
          <Menu
            menuButton={
              <div className="reaction-pill">
                <div className="reaction-pill-icon">
                  <Dots />
                </div>
              </div>
            }
            menuClassName="ctx-menu">
            {menuItems()}
          </Menu>
        </div>
        <NoteCreator autoFocus={true} replyTo={ev} onSend={() => setReply(false)} show={reply} setShow={setReply} />
        <Reactions
          show={showReactions}
          setShow={setShowReactions}
          positive={positive}
          negative={negative}
          reposts={reposts}
          zaps={zaps}
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
  );
}
