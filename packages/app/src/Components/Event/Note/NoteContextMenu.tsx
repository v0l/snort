import { HexKey, NostrLink, NostrPrefix } from "@snort/system";
import { Menu, MenuItem } from "@szhsin/react-menu";
import { useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { NoteContextMenuProps, NoteTranslation } from "@/Components/Event/Note/types";
import Icon from "@/Components/Icons/Icon";
import messages from "@/Components/messages";
import SnortApi from "@/External/SnortApi";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import useModeration from "@/Hooks/useModeration";
import { setBookmarked, setPinned } from "@/Utils/Login";
import { getCurrentSubscription, SubscriptionType } from "@/Utils/Subscription";

import { ReBroadcaster } from "../../ReBroadcaster";

export function NoteContextMenu({ ev, ...props }: NoteContextMenuProps) {
  const { formatMessage } = useIntl();
  const login = useLogin();
  const { mute, block } = useModeration();
  const { publisher, system } = useEventPublisher();
  const [showBroadcast, setShowBroadcast] = useState(false);
  const lang = window.navigator.language;
  const langNames = new Intl.DisplayNames([...window.navigator.languages], {
    type: "language",
  });
  const isMine = ev.pubkey === login.publicKey;

  async function deleteEvent() {
    if (window.confirm(formatMessage(messages.ConfirmDeletion, { id: ev.id.substring(0, 8) })) && publisher) {
      const evDelete = await publisher.delete(ev.id);
      system.BroadcastEvent(evDelete);
    }
  }

  async function share() {
    const link = NostrLink.fromEvent(ev).encode(CONFIG.eventLinkPrefix);
    const url = `${window.location.protocol}//${window.location.host}/${link}`;
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
    if (!props.onTranslated) return;
    const api = new SnortApi();
    const targetLang = lang.split("-")[0].toUpperCase();
    const result = await api.translate({
      text: [ev.content],
      target_lang: targetLang,
    });

    if (
      "translations" in result &&
      result.translations.length > 0 &&
      targetLang != result.translations[0].detected_source_language
    ) {
      props.onTranslated({
        text: result.translations[0].text,
        fromLanguage: langNames.of(result.translations[0].detected_source_language),
        confidence: 1,
      } as NoteTranslation);
    } else {
      props.onTranslated({
        text: "",
        fromLanguage: "",
        confidence: 0,
        skipped: true,
      });
    }
  }

  useEffect(() => {
    const sub = getCurrentSubscription(login.subscriptions);
    if (sub?.type === SubscriptionType.Premium && (login.appData.json.preferences.autoTranslate ?? true)) {
      translate();
    }
  }, []);

  async function copyId() {
    const link = NostrLink.fromEvent(ev).encode(CONFIG.eventLinkPrefix);
    await navigator.clipboard.writeText(link);
  }

  async function pin(id: HexKey) {
    if (publisher) {
      const es = [...login.pinned.item, id];
      const ev = await publisher.pinned(es.map(a => new NostrLink(NostrPrefix.Note, a)));
      system.BroadcastEvent(ev);
      setPinned(login, es, ev.created_at * 1000);
    }
  }

  async function bookmark(id: string) {
    if (publisher) {
      const es = [...login.bookmarked.item, id];
      const ev = await publisher.bookmarks(es.map(a => new NostrLink(NostrPrefix.Note, a)));
      system.BroadcastEvent(ev);
      setBookmarked(login, es, ev.created_at * 1000);
    }
  }

  async function copyEvent() {
    await navigator.clipboard.writeText(JSON.stringify(ev, undefined, "  "));
  }

  const handleReBroadcastButtonClick = () => {
    setShowBroadcast(true);
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
        {!login.pinned.item.includes(ev.id) && !login.readonly && (
          <MenuItem onClick={() => pin(ev.id)}>
            <Icon name="pin" />
            <FormattedMessage {...messages.Pin} />
          </MenuItem>
        )}
        {!login.bookmarked.item.includes(ev.id) && !login.readonly && (
          <MenuItem onClick={() => bookmark(ev.id)}>
            <Icon name="bookmark" />
            <FormattedMessage {...messages.Bookmark} />
          </MenuItem>
        )}
        <MenuItem onClick={() => copyId()}>
          <Icon name="copy" />
          <FormattedMessage {...messages.CopyID} />
        </MenuItem>
        {!login.readonly && (
          <MenuItem onClick={() => mute(ev.pubkey)}>
            <Icon name="mute" />
            <FormattedMessage {...messages.Mute} />
          </MenuItem>
        )}
        <MenuItem onClick={handleReBroadcastButtonClick}>
          <Icon name="relay" />
          <FormattedMessage defaultMessage="Broadcast Event" id="Gxcr08" />
        </MenuItem>
        {ev.pubkey !== login.publicKey && !login.readonly && (
          <MenuItem onClick={() => block(ev.pubkey)}>
            <Icon name="block" />
            <FormattedMessage {...messages.Block} />
          </MenuItem>
        )}
        <MenuItem onClick={() => translate()}>
          <Icon name="translate" />
          <FormattedMessage {...messages.TranslateTo} values={{ lang: langNames.of(lang.split("-")[0]) }} />
        </MenuItem>
        <MenuItem onClick={() => copyEvent()}>
          <Icon name="json" />
          <FormattedMessage {...messages.CopyJSON} />
        </MenuItem>
        {isMine && !login.readonly && (
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
          <div className="reaction-pill cursor-pointer">
            <Icon name="dots" size={15} />
          </div>
        }
        menuClassName="ctx-menu">
        {menuItems()}
      </Menu>
      {showBroadcast && <ReBroadcaster ev={ev} onClose={() => setShowBroadcast(false)} />}
    </>
  );
}
