import { HexKey, NostrLink, NostrPrefix, TaggedNostrEvent } from "@snort/system";
import React, { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { NotePropsOptions } from "@/Components/Event/EventComponent";
import { NoteContextMenu, NoteTranslation } from "@/Components/Event/Note/NoteContextMenu";
import NoteTime from "@/Components/Event/Note/NoteTime";
import ReactionsModal from "@/Components/Event/Note/ReactionsModal";
import ReplyTag from "@/Components/Event/Note/ReplyTag";
import Icon from "@/Components/Icons/Icon";
import messages from "@/Components/messages";
import ProfileImage from "@/Components/User/ProfileImage";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import { setBookmarked, setPinned } from "@/Utils/Login";

export default function NoteHeader(props: {
  ev: TaggedNostrEvent;
  options: NotePropsOptions;
  setTranslated?: (t: NoteTranslation) => void;
  context?: React.ReactNode;
}) {
  const [showReactions, setShowReactions] = useState(false);
  const { ev, options, setTranslated } = props;
  const { formatMessage } = useIntl();
  const { pinned, bookmarked } = useLogin();
  const { publisher, system } = useEventPublisher();
  const login = useLogin();

  async function unpin(id: HexKey) {
    if (options.canUnpin && publisher) {
      if (window.confirm(formatMessage(messages.ConfirmUnpin))) {
        const es = pinned.item.filter(e => e !== id);
        const ev = await publisher.pinned(es.map(a => new NostrLink(NostrPrefix.Note, a)));
        system.BroadcastEvent(ev);
        setPinned(login, es, ev.created_at * 1000);
      }
    }
  }

  async function unbookmark(id: HexKey) {
    if (options.canUnbookmark && publisher) {
      if (window.confirm(formatMessage(messages.ConfirmUnbookmark))) {
        const es = bookmarked.item.filter(e => e !== id);
        const ev = await publisher.pinned(es.map(a => new NostrLink(NostrPrefix.Note, a)));
        system.BroadcastEvent(ev);
        setBookmarked(login, es, ev.created_at * 1000);
      }
    }
  }

  const onTranslated = setTranslated ? (t: NoteTranslation) => setTranslated(t) : undefined;

  return (
    <div className="header flex">
      <ProfileImage
        pubkey={ev.pubkey}
        subHeader={<ReplyTag ev={ev} />}
        link={options.canClick === undefined ? undefined : ""}
        showProfileCard={options.showProfileCard ?? true}
        showBadges={true}
      />
      <div className="info">
        {props.context}
        {(options.showTime || options.showBookmarked) && (
          <>
            {options.showBookmarked && (
              <div className={`saved ${options.canUnbookmark ? "pointer" : ""}`} onClick={() => unbookmark(ev.id)}>
                <Icon name="bookmark" /> <FormattedMessage {...messages.Bookmarked} />
              </div>
            )}
            {!options.showBookmarked && <NoteTime from={ev.created_at * 1000} />}
          </>
        )}
        {options.showPinned && (
          <div className={`pinned ${options.canUnpin ? "pointer" : ""}`} onClick={() => unpin(ev.id)}>
            <Icon name="pin" /> <FormattedMessage {...messages.Pinned} />
          </div>
        )}
        {options.showContextMenu && (
          <NoteContextMenu
            ev={ev}
            react={async () => {}}
            onTranslated={onTranslated}
            setShowReactions={setShowReactions}
          />
        )}
      </div>
      {showReactions && <ReactionsModal onClose={() => setShowReactions(false)} event={ev} />}
    </div>
  );
}
