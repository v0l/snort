import "./Notifications.css";
import { Suspense, lazy, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { EventExt, EventKind, NostrEvent, NostrLink, NostrPrefix, TaggedNostrEvent, parseZap } from "@snort/system";
import { unwrap } from "@snort/shared";
import { useEventFeed, useUserProfile } from "@snort/system-react";
import { useInView } from "react-intersection-observer";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";

import useLogin from "@/Hooks/useLogin";
import { markNotificationsRead } from "@/Utils/Login";
import { Notifications } from "@/Cache";
import { dedupe, orderDescending, getDisplayName } from "@/Utils";
import Icon from "@/Components/Icons/Icon";
import ProfileImage from "@/Components/User/ProfileImage";
import useModeration from "@/Hooks/useModeration";
import Text from "@/Components/Text/Text";
import { formatShort } from "@/Utils/Number";
import { LiveEvent } from "@/Components/LiveStream/LiveEvent";
import ProfilePreview from "@/Components/User/ProfilePreview";
import { ShowMoreInView } from "@/Components/Event/ShowMore";
import PageSpinner from "@/Components/PageSpinner";
const NotificationGraph = lazy(() => import("@/Pages/Notifications/NotificationChart"));

function notificationContext(ev: TaggedNostrEvent) {
  switch (ev.kind) {
    case EventKind.ZapReceipt: {
      const aTag = ev.tags.find(a => a[0] === "a");
      if (aTag) {
        return NostrLink.fromTag(aTag);
      }
      const eTag = ev.tags.find(a => a[0] === "e");
      if (eTag) {
        return NostrLink.fromTag(eTag);
      }
      const pTag = ev.tags.find(a => a[0] === "p");
      if (pTag) {
        return NostrLink.fromTag(pTag);
      }
      break;
    }
    case EventKind.Repost:
    case EventKind.Reaction: {
      const thread = EventExt.extractThread(ev);
      const tag = unwrap(thread?.replyTo ?? thread?.root ?? { value: ev.id, key: "e" });
      if (tag.key === "e" || tag.key === "a") {
        return NostrLink.fromThreadTag(tag);
      } else {
        throw new Error("Unknown thread context");
      }
    }
    case EventKind.TextNote: {
      return NostrLink.fromEvent(ev);
    }
  }
}

export default function NotificationsPage({ onClick }: { onClick?: (link: NostrLink) => void }) {
  const login = useLogin();
  const { isMuted } = useModeration();
  const groupInterval = 3600 * 3;
  const [showN, setShowN] = useState(10);

  useEffect(() => {
    markNotificationsRead(login);
  }, []);

  const notifications = useSyncExternalStore(
    c => Notifications.hook(c, "*"),
    () => Notifications.snapshot(),
  );

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
          [...timeGrouped.entries()]
            .slice(0, showN)
            .map(([k, g]) => <NotificationGroup key={k} evs={g} onClick={onClick} />)}

        <ShowMoreInView onClick={() => setShowN(s => Math.min(timeGrouped.size, s + 5))} />
      </div>
    </>
  );
}

function NotificationGroup({ evs, onClick }: { evs: Array<TaggedNostrEvent>; onClick?: (link: NostrLink) => void }) {
  const { ref, inView } = useInView({ triggerOnce: true });
  const { formatMessage } = useIntl();
  const kind = evs[0].kind;
  const navigate = useNavigate();

  const zaps = useMemo(() => {
    return evs.filter(a => a.kind === EventKind.ZapReceipt).map(a => parseZap(a));
  }, [evs]);
  const pubkeys = dedupe(
    evs.map(a => {
      if (a.kind === EventKind.ZapReceipt) {
        const zap = unwrap(zaps.find(b => b.id === a.id));
        return zap.anonZap ? "anon" : zap.sender ?? a.pubkey;
      }
      return a.pubkey;
    }),
  );
  const firstPubkey = pubkeys[0];
  const firstPubkeyProfile = useUserProfile(inView ? (firstPubkey === "anon" ? "" : firstPubkey) : "");
  const context = notificationContext(evs[0]);
  const totalZaps = zaps.reduce((acc, v) => acc + v.amount, 0);

  const iconName = () => {
    switch (kind) {
      case EventKind.Reaction:
        return "heart-solid";
      case EventKind.ZapReceipt:
        return "zap-solid";
      case EventKind.Repost:
        return "repeat";
      case EventKind.TextNote:
        return "reverse-left";
    }
    return "";
  };

  const actionName = (n: number, name: string) => {
    switch (kind) {
      case EventKind.TextNote: {
        return "";
      }
      case EventKind.Reaction: {
        return (
          <FormattedMessage
            defaultMessage="{n,plural,=0{{name} liked} other{{name} & {n} others liked}}"
            id="kuPHYE"
            values={{
              n,
              name,
            }}
          />
        );
      }
      case EventKind.Repost: {
        return (
          <FormattedMessage
            defaultMessage="{n,plural,=0{{name} reposted} other{{name} & {n} others reposted}}"
            id="kJYo0u"
            values={{
              n,
              name,
            }}
          />
        );
      }
      case EventKind.ZapReceipt: {
        return (
          <FormattedMessage
            defaultMessage="{n,plural,=0{{name} zapped} other{{name} & {n} others zapped}}"
            id="Lw+I+J"
            values={{
              n,
              name,
            }}
          />
        );
      }
    }
    return `${kind}'d your post`;
  };

  return (
    <div className="card notification-group" ref={ref}>
      {inView && (
        <>
          <div className="flex flex-col g12">
            <div>
              <Icon name={iconName()} size={24} className={iconName()} />
            </div>
            <div>{kind === EventKind.ZapReceipt && formatShort(totalZaps)}</div>
          </div>
          <div className="flex flex-col w-max g12">
            <div className="flex">
              {pubkeys
                .filter(a => a !== "anon")
                .slice(0, 12)
                .map(v => (
                  <ProfileImage
                    key={v}
                    showUsername={kind === EventKind.TextNote}
                    pubkey={v}
                    size={40}
                    overrideUsername={v === "" ? formatMessage({ defaultMessage: "Anon", id: "bfvyfs" }) : undefined}
                  />
                ))}
            </div>
            {kind !== EventKind.TextNote && (
              <div className="names">
                {actionName(
                  pubkeys.length - 1,
                  firstPubkey === "anon"
                    ? formatMessage({ defaultMessage: "Anon", id: "bfvyfs" })
                    : getDisplayName(firstPubkeyProfile, firstPubkey),
                )}
              </div>
            )}
            {context && (
              <NotificationContext
                link={context}
                onClick={() => {
                  if (onClick) {
                    onClick(context);
                  } else {
                    navigate(`/${context.encode(CONFIG.eventLinkPrefix)}`);
                  }
                }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function NotificationContext({ link, onClick }: { link: NostrLink; onClick: () => void }) {
  const { data: ev } = useEventFeed(link);
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
