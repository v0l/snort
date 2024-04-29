import { NostrLink } from "@snort/system";
import { useCallback } from "react";
import { FormattedMessage } from "react-intl";
import { Outlet } from "react-router-dom";

import { RootTabs } from "@/Components/Feed/RootTabs";
import TimelineFollows from "@/Components/Feed/TimelineFollows";
import Icon from "@/Components/Icons/Icon";
import { transformTextCached } from "@/Hooks/useTextTransformCache";
import Articles from "@/Pages/Deck/Articles";
import NotificationsPage from "@/Pages/Notifications/Notifications";

export function NotesCol() {
  return (
    <div>
      <div className="deck-col-header flex">
        <div className="flex flex-1 g8">
          <Icon name="rows-01" size={24} />
          <FormattedMessage defaultMessage="Notes" />
        </div>
        <div className="flex-1">
          <RootTabs base="/deck" />
        </div>
      </div>
      <div>
        <Outlet />
      </div>
    </div>
  );
}

export function ArticlesCol() {
  return (
    <div>
      <div className="deck-col-header flex g8">
        <Icon name="file-06" size={24} />
        <FormattedMessage defaultMessage="Articles" />
      </div>
      <div>
        <Articles />
      </div>
    </div>
  );
}

export function MediaCol({ setThread }: { setThread: (e: NostrLink) => void }) {
  const noteOnClick = useCallback(
    e => {
      setThread(NostrLink.fromEvent(e));
    },
    [setThread],
  );

  return (
    <div>
      <div className="flex items-center gap-2 p-2 border-b border-border-color">
        <Icon name="camera-lens" size={24} />
        <FormattedMessage defaultMessage="Media" />
      </div>
      <TimelineFollows
        postsOnly={true}
        liveStreams={false}
        noteFilter={e => {
          const parsed = transformTextCached(e.id, e.content, e.tags);
          const images = parsed.filter(a => a.type === "media" && a.mimeType?.startsWith("image/"));
          return images.length > 0;
        }}
        displayAs="grid"
        showDisplayAsSelector={false}
        noteOnClick={noteOnClick}
      />
    </div>
  );
}

export function NotificationsCol({ setThread }: { setThread: (e: NostrLink) => void }) {
  return (
    <div>
      <div className="deck-col-header flex g8">
        <Icon name="bell-solid" size={24} />
        <FormattedMessage defaultMessage="Notifications" />
      </div>
      <div>
        <NotificationsPage onClick={setThread} />
      </div>
    </div>
  );
}
