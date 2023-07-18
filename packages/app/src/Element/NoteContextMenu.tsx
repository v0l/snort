import { FormattedMessage, useIntl } from "react-intl";
import { HexKey, Lists, NostrPrefix, TaggedRawEvent, encodeTLV } from "@snort/system";
import { Menu, MenuItem } from "@szhsin/react-menu";
import { useDispatch, useSelector } from "react-redux";

import { TranslateHost } from "Const";
import { System } from "index";
import Icon from "Icons/Icon";
import { setPinned, setBookmarked } from "Login";
import {
  setNote as setReBroadcastNote,
  setShow as setReBroadcastShow,
  reset as resetReBroadcast,
} from "State/ReBroadcast";
import messages from "Element/messages";
import useLogin from "Hooks/useLogin";
import useModeration from "Hooks/useModeration";
import useEventPublisher from "Feed/EventPublisher";
import { RootState } from "State/Store";
import { ReBroadcaster } from "./ReBroadcaster";

export interface NoteTranslation {
  text: string;
  fromLanguage: string;
  confidence: number;
}

interface NosteContextMenuProps {
  ev: TaggedRawEvent;
  setShowReactions(b: boolean): void;
  react(content: string): Promise<void>;
  onTranslated?: (t: NoteTranslation) => void;
}

export function NoteContextMenu({ ev, ...props }: NosteContextMenuProps) {
  const dispatch = useDispatch();
  const { formatMessage } = useIntl();
  const login = useLogin();
  const { pinned, bookmarked, publicKey, preferences: prefs } = login;
  const { mute, block } = useModeration();
  const publisher = useEventPublisher();
  const showReBroadcastModal = useSelector((s: RootState) => s.reBroadcast.show);
  const reBroadcastNote = useSelector((s: RootState) => s.reBroadcast.note);
  const willRenderReBroadcast = showReBroadcastModal && reBroadcastNote && reBroadcastNote?.id === ev.id;
  const lang = window.navigator.language;
  const langNames = new Intl.DisplayNames([...window.navigator.languages], {
    type: "language",
  });
  const isMine = ev.pubkey === publicKey;

  async function deleteEvent() {
    if (window.confirm(formatMessage(messages.ConfirmDeletion, { id: ev.id.substring(0, 8) })) && publisher) {
      const evDelete = await publisher.delete(ev.id);
      System.BroadcastEvent(evDelete);
    }
  }

  async function share() {
    const link = encodeTLV(NostrPrefix.Event, ev.id, ev.relays);
    const url = `${window.location.protocol}//${window.location.host}/e/${link}`;
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
        q: ev.content,
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
        } as NoteTranslation);
      }
    }
  }

  async function copyId() {
    const link = encodeTLV(NostrPrefix.Event, ev.id, ev.relays);
    await navigator.clipboard.writeText(link);
  }

  async function pin(id: HexKey) {
    if (publisher) {
      const es = [...pinned.item, id];
      const ev = await publisher.noteList(es, Lists.Pinned);
      System.BroadcastEvent(ev);
      setPinned(login, es, ev.created_at * 1000);
    }
  }

  async function bookmark(id: HexKey) {
    if (publisher) {
      const es = [...bookmarked.item, id];
      const ev = await publisher.noteList(es, Lists.Bookmarked);
      System.BroadcastEvent(ev);
      setBookmarked(login, es, ev.created_at * 1000);
    }
  }

  async function copyEvent() {
    await navigator.clipboard.writeText(JSON.stringify(ev, undefined, "  "));
  }

  const handleReBroadcastButtonClick = () => {
    if (reBroadcastNote?.id !== ev.id) {
      dispatch(resetReBroadcast());
    }

    dispatch(setReBroadcastNote(ev));
    dispatch(setReBroadcastShow(!showReBroadcastModal));
  };

  function menuItems() {
    return (
      <>
        <div className="close-menu-container">
          {/* This menu item serves as a "close menu" button;
          it allows the user to click anywhere nearby the menu to close it. */}
          <MenuItem>
            <div className="close-menu" />
          </MenuItem>
        </div>
        <MenuItem onClick={() => props.setShowReactions(true)}>
          <Icon name="heart" />
          <FormattedMessage {...messages.Reactions} />
        </MenuItem>
        <MenuItem onClick={() => share()}>
          <Icon name="share" />
          <FormattedMessage {...messages.Share} />
        </MenuItem>
        {!pinned.item.includes(ev.id) && (
          <MenuItem onClick={() => pin(ev.id)}>
            <Icon name="pin" />
            <FormattedMessage {...messages.Pin} />
          </MenuItem>
        )}
        {!bookmarked.item.includes(ev.id) && (
          <MenuItem onClick={() => bookmark(ev.id)}>
            <Icon name="bookmark" />
            <FormattedMessage {...messages.Bookmark} />
          </MenuItem>
        )}
        <MenuItem onClick={() => copyId()}>
          <Icon name="copy" />
          <FormattedMessage {...messages.CopyID} />
        </MenuItem>
        <MenuItem onClick={() => mute(ev.pubkey)}>
          <Icon name="mute" />
          <FormattedMessage {...messages.Mute} />
        </MenuItem>
        {prefs.enableReactions && (
          <MenuItem onClick={() => props.react("-")}>
            <Icon name="dislike" />
            <FormattedMessage {...messages.DislikeAction} />
          </MenuItem>
        )}
        {ev.pubkey === publicKey && (
          <MenuItem onClick={handleReBroadcastButtonClick}>
            <Icon name="relay" />
            <FormattedMessage {...messages.ReBroadcast} />
          </MenuItem>
        )}
        {ev.pubkey !== publicKey && (
          <MenuItem onClick={() => block(ev.pubkey)}>
            <Icon name="block" />
            <FormattedMessage {...messages.Block} />
          </MenuItem>
        )}
        <MenuItem onClick={() => translate()}>
          <Icon name="translate" />
          <FormattedMessage {...messages.TranslateTo} values={{ lang: langNames.of(lang.split("-")[0]) }} />
        </MenuItem>
        {prefs.showDebugMenus && (
          <MenuItem onClick={() => copyEvent()}>
            <Icon name="json" />
            <FormattedMessage {...messages.CopyJSON} />
          </MenuItem>
        )}
        {isMine && (
          <MenuItem onClick={() => deleteEvent()}>
            <Icon name="trash" className="red" />
            <FormattedMessage {...messages.Delete} />
          </MenuItem>
        )}
      </>
    );
  }

  return (
    <>
      <Menu
        menuButton={
          <div className="reaction-pill">
            <Icon name="dots" size={15} />
          </div>
        }
        menuClassName="ctx-menu">
        {menuItems()}
      </Menu>
      {willRenderReBroadcast && <ReBroadcaster />}
    </>
  );
}
