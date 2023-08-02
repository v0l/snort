import "./Notifications.css";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import {
  EventExt,
  EventKind,
  NostrEvent,
  NostrLink,
  NostrPrefix,
  TaggedRawEvent,
  createNostrLink,
} from "@snort/system";
import { unwrap } from "@snort/shared";
import { useUserProfile } from "@snort/system-react";
import { useInView } from "react-intersection-observer";
import { FormattedMessage } from "react-intl";

import useLogin from "Hooks/useLogin";
import { markNotificationsRead } from "Login";
import { Notifications } from "Cache";
import { dedupe, findTag, orderDescending } from "SnortUtils";
import Note from "Element/Note";
import Icon from "Icons/Icon";
import ProfileImage, { getDisplayName } from "Element/ProfileImage";
import useModeration from "Hooks/useModeration";
import { System } from "index";
import useEventFeed from "Feed/EventFeed";
import Text from "Element/Text";

function notificationContext(ev: TaggedRawEvent) {
  switch (ev.kind) {
    case EventKind.ZapReceipt: {
      const aTag = findTag(ev, "a");
      if (aTag) {
        const [kind, author, d] = aTag.split(":");
        return createNostrLink(NostrPrefix.Address, d, undefined, Number(kind), author);
      }
      const eTag = findTag(ev, "e");
      if (eTag) {
        return createNostrLink(NostrPrefix.Event, eTag);
      }
      const pTag = ev.tags.filter(a => a[0] === "p").slice(-1)?.[0];
      if (pTag) {
        return createNostrLink(NostrPrefix.PublicKey, pTag[1]);
      }
      break;
    }
    case EventKind.Repost:
    case EventKind.TextNote:
    case EventKind.Reaction: {
      const thread = EventExt.extractThread(ev);
      const id = unwrap(thread?.replyTo?.value ?? thread?.root?.value ?? ev.id);
      return createNostrLink(NostrPrefix.Event, id);
    }
  }
}

export default function NotificationsPage() {
  const login = useLogin();
  const { isMuted } = useModeration();
  const groupInterval = 3600 * 3;

  useEffect(() => {
    markNotificationsRead(login);
  }, []);

  const notifications = useSyncExternalStore(
    c => Notifications.hook(c, "*"),
    () => Notifications.snapshot()
  );

  const timeKey = (ev: NostrEvent) => {
    const onHour = ev.created_at - (ev.created_at % groupInterval);
    return onHour.toString();
  };

  const timeGrouped = useMemo(() => {
    return orderDescending([...notifications])
      .filter(a => !isMuted(a.pubkey))
      .reduce((acc, v) => {
        const key = `${timeKey(v)}:${notificationContext(v as TaggedRawEvent)?.encode()}:${v.kind}`;
        if (acc.has(key)) {
          unwrap(acc.get(key)).push(v as TaggedRawEvent);
        } else {
          acc.set(key, [v as TaggedRawEvent]);
        }
        return acc;
      }, new Map<string, Array<TaggedRawEvent>>());
  }, [notifications]);

  return (
    <div className="main-content">
      {login.publicKey && [...timeGrouped.entries()].map(([k, g]) => <NotificationGroup key={k} evs={g} />)}
    </div>
  );
}

function NotificationGroup({ evs }: { evs: Array<TaggedRawEvent> }) {
  const { ref, inView } = useInView({ triggerOnce: true });
  const kind = evs[0].kind;

  const iconName = () => {
    switch (kind) {
      case EventKind.Reaction:
        return "heart-solid";
      case EventKind.ZapReceipt:
        return "zap-solid";
      case EventKind.Repost:
        return "repeat";
    }
    return "";
  };

  const actionName = (n: number, name: string) => {
    switch (kind) {
      case EventKind.Reaction:
        return (
          <FormattedMessage
            defaultMessage={"{n,plural,=0{{name} liked} other{{name} & {n} others liked}}"}
            values={{
              n,
              name,
            }}
          />
        );
      case EventKind.Repost:
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
    return `${kind}'d your post`;
  };

  if (kind === EventKind.TextNote) {
    return (
      <>
        {evs.map(v => (
          <Note data={v} related={[]} />
        ))}
      </>
    );
  }

  const pubkeys = dedupe(evs.map(a => a.pubkey));
  const firstPubkey = pubkeys[0];
  const firstPubkeyProfile = useUserProfile(System, inView ? firstPubkey : "");
  const context = notificationContext(evs[0]);

  return (
    <div className="card notification-group" ref={ref}>
      <div className="flex g24">
        <Icon name={iconName()} size={24} />
        <div className="flex g8">
          {pubkeys.map(v => (
            <ProfileImage key={v} showUsername={false} pubkey={v} size={40} />
          ))}
        </div>
      </div>
      <div className="names">
        <div></div>
        {actionName(pubkeys.length - 1, getDisplayName(firstPubkeyProfile, firstPubkey))}
      </div>
      <div className="content">{context && <NotificationContext link={context} />}</div>
    </div>
  );
}

function NotificationContext({ link }: { link: NostrLink }) {
  const { data: ev } = useEventFeed(link);

  return (
    <div className="card">
      <Text content={ev?.content ?? ""} tags={ev?.tags ?? []} creator={ev?.pubkey ?? ""} />
    </div>
  );
}
