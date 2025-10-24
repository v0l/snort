import { EventKind, NostrLink, TaggedNostrEvent } from "@snort/system";
import React, { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { NotePropsOptions } from "@/Components/Event/EventComponent";
import { NoteContextMenu } from "@/Components/Event/Note/NoteContextMenu";
import NoteTime from "@/Components/Event/Note/NoteTime";
import ReactionsModal from "@/Components/Event/Note/ReactionsModal";
import ReplyTag from "@/Components/Event/Note/ReplyTag";
import { NoteTranslation } from "@/Components/Event/Note/types";
import Icon from "@/Components/Icons/Icon";
import messages from "@/Components/messages";
import ProfileImage from "@/Components/User/ProfileImage";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";

export default function NoteHeader(props: {
  ev: TaggedNostrEvent;
  options: NotePropsOptions;
  setTranslated?: (t: NoteTranslation) => void;
  context?: React.ReactNode;
}) {
  const [showReactions, setShowReactions] = useState(false);
  const { ev, options, setTranslated } = props;
  const { formatMessage } = useIntl();
  const { publisher } = useEventPublisher();
  const login = useLogin();

  async function unpin() {
    if (options.canUnpin && publisher) {
      if (window.confirm(formatMessage(messages.ConfirmUnpin))) {
        await login.state.removeFromList(EventKind.PinList, NostrLink.fromEvent(ev));
      }
    }
  }

  async function unbookmark() {
    if (options.canUnbookmark && publisher) {
      if (window.confirm(formatMessage(messages.ConfirmUnbookmark))) {
        await login.state.removeFromList(EventKind.BookmarksList, NostrLink.fromEvent(ev));
      }
    }
  }

  const onTranslated = setTranslated ? (t: NoteTranslation) => setTranslated(t) : undefined;

  return (
    <div className="flex justify-between">
      <ProfileImage
        pubkey={ev.pubkey}
        subHeader={<ReplyTag ev={ev} />}
        link={options.canClick === undefined ? undefined : ""}
        showProfileCard={options.showProfileCard ?? true}
        showBadges={true}
      />
      <div className="flex items-center gap-2 text-neutral-400 text-sm">
        {props.context}
        {(options.showTime || options.showBookmarked) && (
          <>
            {options.showBookmarked && (
              <div className={`saved ${options.canUnbookmark ? "cursor-pointer" : ""}`} onClick={() => unbookmark()}>
                <Icon name="bookmark" /> <FormattedMessage {...messages.Bookmarked} />
              </div>
            )}
            {!options.showBookmarked && <NoteTime from={ev.created_at * 1000} />}
          </>
        )}
        {options.showPinned && (
          <div className={options.canUnpin ? "cursor-pointer" : ""} onClick={() => unpin()}>
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
