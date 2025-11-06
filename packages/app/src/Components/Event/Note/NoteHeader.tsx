import { EventKind, NostrLink, TaggedNostrEvent } from "@snort/system";
import React from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { NotePropsOptions } from "@/Components/Event/EventComponent";
import { NoteContextMenu } from "@/Components/Event/Note/NoteContextMenu";
import NoteTime from "@/Components/Event/Note/NoteTime";
import ReplyTag from "@/Components/Event/Note/ReplyTag";
import Icon from "@/Components/Icons/Icon";
import messages from "@/Components/messages";
import ProfileImage from "@/Components/User/ProfileImage";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";

export default function NoteHeader(props: {
  ev: TaggedNostrEvent;
  options: NotePropsOptions;
  context?: React.ReactNode;
}) {
  const { ev, options } = props;
  const { formatMessage } = useIntl();
  const { publisher } = useEventPublisher();
  const login = useLogin();

  async function unpin() {
    if (options.canUnpin && publisher) {
      if (window.confirm(formatMessage(messages.ConfirmUnpin))) {
        login.state.removeFromList(EventKind.PinList, NostrLink.fromEvent(ev));
      }
    }
  }

  async function unbookmark() {
    if (options.canUnbookmark && publisher) {
      if (window.confirm(formatMessage(messages.ConfirmUnbookmark))) {
        login.state.removeFromList(EventKind.BookmarksList, NostrLink.fromEvent(ev));
      }
    }
  }

  return (
    <div className="flex justify-between">
      <ProfileImage
        pubkey={ev.pubkey}
        subHeader={<ReplyTag ev={ev} />}
        link={options.canClick === undefined ? undefined : ""}
        showProfileCard={options.showProfileCard ?? true}
      />
      <div className="flex items-center gap-2">
        {props.context}
        {(options.showTime || options.showBookmarked) && (
          <>
            {options.showBookmarked && (
              <div className="text-sm text-neutral-500 flex gap-1" onClick={() => unbookmark()}>
                <Icon name="bookmark" />
                <FormattedMessage {...messages.Bookmarked} />
              </div>
            )}
            {!options.showBookmarked && <NoteTime from={ev.created_at * 1000} />}
          </>
        )}
        {options.showPinned && (
          <div className="text-sm text-neutral-500 flex gap-1" onClick={() => unpin()}>
            <Icon name="pin" />
            <FormattedMessage {...messages.Pinned} />
          </div>
        )}
        {options.showContextMenu && <NoteContextMenu />}
      </div>
    </div>
  );
}
