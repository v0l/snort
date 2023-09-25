import "./Notifications.css";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { EventExt, EventKind, NostrEvent, NostrLink, NostrPrefix, TaggedNostrEvent, parseZap } from "@snort/system";
import { unwrap } from "@snort/shared";
import { useUserProfile } from "@snort/system-react";
import { useInView } from "react-intersection-observer";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";

import useLogin from "Hooks/useLogin";
import { markNotificationsRead } from "Login";
import { Notifications, UserCache } from "Cache";
import { dedupe, findTag, orderDescending } from "SnortUtils";
import Icon from "Icons/Icon";
import ProfileImage, { getDisplayName } from "Element/ProfileImage";
import useModeration from "Hooks/useModeration";
import { useEventFeed } from "Feed/EventFeed";
import Text from "Element/Text";
import { formatShort } from "Number";
import { LiveEvent } from "Element/LiveEvent";
import ProfilePreview from "Element/ProfilePreview";

function notificationContext(ev: TaggedNostrEvent) {
  switch (ev.kind) {
    case EventKind.ZapReceipt: {
      const aTag = findTag(ev, "a");
      if (aTag) {
        const [kind, author, d] = aTag.split(":");
        return new NostrLink(NostrPrefix.Address, d, Number(kind), author);
      }
      const eTag = findTag(ev, "e");
      if (eTag) {
        return new NostrLink(NostrPrefix.Event, eTag);
      }
      const pTag = ev.tags.filter(a => a[0] === "p").slice(-1)?.[0];
      if (pTag) {
        return new NostrLink(NostrPrefix.PublicKey, pTag[1]);
      }
      break;
    }
    case EventKind.Repost:
    case EventKind.Reaction: {
      const thread = EventExt.extractThread(ev);
      const tag = unwrap(thread?.replyTo ?? thread?.root ?? { value: ev.id, key: "e" });
      if (tag.key === "e") {
        return new NostrLink(NostrPrefix.Event, unwrap(tag.value));
      } else if (tag.key === "a") {
        const [kind, author, d] = unwrap(tag.value).split(":");
        return new NostrLink(NostrPrefix.Address, d, Number(kind), author);
      } else {
        throw new Error("Unknown thread context");
      }
    }
    case EventKind.TextNote: {
      return new NostrLink(NostrPrefix.Note, ev.id);
    }
  }
}

export default function NotificationsPage({ onClick }: { onClick?: (link: NostrLink) => void }) {
  const login = useLogin();
  const { isMuted } = useModeration();
  const groupInterval = 3600 * 3;

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

  const timeGrouped = useMemo(() => {
    return orderDescending([...notifications])
      .filter(a => !isMuted(a.pubkey) && a.tags.some(b => b[0] === "p" && b[1] === login.publicKey))
      .reduce((acc, v) => {
        const key = `${timeKey(v)}:${notificationContext(v as TaggedNostrEvent)?.encode()}:${v.kind}`;
        if (acc.has(key)) {
          unwrap(acc.get(key)).push(v as TaggedNostrEvent);
        } else {
          acc.set(key, [v as TaggedNostrEvent]);
        }
        return acc;
      }, new Map<string, Array<TaggedNostrEvent>>());
  }, [notifications]);

  return (
    <div className="main-content">
      {login.publicKey &&
        [...timeGrouped.entries()].map(([k, g]) => <NotificationGroup key={k} evs={g} onClick={onClick} />)}
    </div>
  );
}

function NotificationGroup({ evs, onClick }: { evs: Array<TaggedNostrEvent>; onClick?: (link: NostrLink) => void }) {
  const { ref, inView } = useInView({ triggerOnce: true });
  const { formatMessage } = useIntl();
  const kind = evs[0].kind;
  const navigate = useNavigate();

  const zaps = useMemo(() => {
    return evs.filter(a => a.kind === EventKind.ZapReceipt).map(a => parseZap(a, UserCache));
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
            defaultMessage={"{n,plural,=0{{name} liked} other{{name} & {n} others liked}}"}
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
            defaultMessage={"{n,plural,=0{{name} reposted} other{{name} & {n} others reposted}}"}
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
            defaultMessage={"{n,plural,=0{{name} zapped} other{{name} & {n} others zapped}}"}
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
          <div className="flex-column g12">
            <div>
              <Icon name={iconName()} size={24} className={iconName()} />
            </div>
            <div>{kind === EventKind.ZapReceipt && formatShort(totalZaps)}</div>
          </div>
          <div className="flex-column w-max g12">
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
                    overrideUsername={v === "" ? formatMessage({ defaultMessage: "Anon" }) : undefined}
                  />
                ))}
            </div>
            {kind !== EventKind.TextNote && (
              <div className="names">
                {actionName(
                  pubkeys.length - 1,
                  firstPubkey === "anon"
                    ? formatMessage({ defaultMessage: "Anon" })
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
                    navigate(`/e/${context.encode()}`);
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
