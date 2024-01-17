import "./Notifications.css";

import { unwrap } from "@snort/shared";
import { EventKind, NostrEvent, NostrLink, NostrPrefix, TaggedNostrEvent } from "@snort/system";
import { useEventFeed } from "@snort/system-react";
import { lazy, Suspense, useEffect, useMemo } from "react";

import { ShowMoreInView } from "@/Components/Event/ShowMore";
import { LiveEvent } from "@/Components/LiveStream/LiveEvent";
import PageSpinner from "@/Components/PageSpinner";
import Text from "@/Components/Text/Text";
import ProfilePreview from "@/Components/User/ProfilePreview";
import { useNotificationsView } from "@/Feed/WorkerRelayView";
import useLogin from "@/Hooks/useLogin";
import useModeration from "@/Hooks/useModeration";
import { orderDescending } from "@/Utils";
import { markNotificationsRead } from "@/Utils/Login";

import { notificationContext } from "./notificationContext";
import { NotificationGroup } from "./NotificationGroup";
const NotificationGraph = lazy(() => import("@/Pages/Notifications/NotificationChart"));

export default function NotificationsPage({ onClick }: { onClick?: (link: NostrLink) => void }) {
  const login = useLogin();
  const { isMuted } = useModeration();
  const groupInterval = 3600 * 6;

  useEffect(() => {
    markNotificationsRead(login);
  }, []);

  const notifications = useNotificationsView();

  const timeKey = (ev: NostrEvent) => {
    const onHour = ev.created_at - (ev.created_at % groupInterval);
    return onHour.toString();
  };

  const myNotifications = useMemo(() => {
    return orderDescending([...notifications]).filter(
      a => !isMuted(a.pubkey) && a.tags.some(b => b[0] === "p" && b[1] === login.publicKey),
    );
  }, [notifications, login.publicKey]);

  const timeGrouped = useMemo(() => {
    return myNotifications.reduce((acc, v) => {
      const key = `${timeKey(v)}:${notificationContext(v as TaggedNostrEvent)?.encode(CONFIG.eventLinkPrefix)}:${
        v.kind
      }`;
      if (acc.has(key)) {
        unwrap(acc.get(key)).push(v as TaggedNostrEvent);
      } else {
        acc.set(key, [v as TaggedNostrEvent]);
      }
      return acc;
    }, new Map<string, Array<TaggedNostrEvent>>());
  }, [myNotifications]);

  return (
    <>
      <div className="main-content">
        {CONFIG.features.notificationGraph && (
          <Suspense fallback={<PageSpinner />}>
            <NotificationGraph evs={myNotifications} />
          </Suspense>
        )}
        {login.publicKey &&
          [...timeGrouped.entries()].map(([k, g]) => <NotificationGroup key={k} evs={g} onClick={onClick} />)}

        <ShowMoreInView onClick={() => {}} />
      </div>
    </>
  );
}

export function NotificationContext({ link, onClick }: { link: NostrLink; onClick: () => void }) {
  const ev = useEventFeed(link);
  if (link.type === NostrPrefix.PublicKey) {
    return <ProfilePreview pubkey={link.id} actions={<></>} />;
  }
  if (!ev) return;
  if (ev.kind === EventKind.LiveEvent) {
    return <LiveEvent ev={ev} />;
  }
  return (
    <Text
      id={ev.id}
      content={ev.content}
      tags={ev.tags}
      creator={ev.pubkey}
      truncate={120}
      disableLinkPreview={true}
      className="content"
      onClick={onClick}
    />
  );
}
