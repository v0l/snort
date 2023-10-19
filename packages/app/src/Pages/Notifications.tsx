import "./Notifications.css";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { EventExt, EventKind, NostrEvent, NostrLink, NostrPrefix, TaggedNostrEvent, parseZap } from "@snort/system";
import { unixNow, unwrap } from "@snort/shared";
import { useUserProfile } from "@snort/system-react";
import { useInView } from "react-intersection-observer";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, Tooltip, XAxis, YAxis } from "recharts";

import useLogin from "Hooks/useLogin";
import { markNotificationsRead } from "Login";
import { Notifications, UserCache } from "Cache";
import { dedupe, findTag, orderAscending, orderDescending, getDisplayName } from "SnortUtils";
import Icon from "Icons/Icon";
import ProfileImage from "Element/User/ProfileImage";
import useModeration from "Hooks/useModeration";
import { useEventFeed } from "Feed/EventFeed";
import Text from "Element/Text";
import { formatShort } from "Number";
import { LiveEvent } from "Element/LiveEvent";
import ProfilePreview from "Element/User/ProfilePreview";
import { Day } from "Const";
import Tabs, { Tab } from "Element/Tabs";
import classNames from "classnames";
import { AsyncIcon } from "Element/AsyncIcon";

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
        return new NostrLink(CONFIG.eventLinkPrefix, eTag);
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
        return new NostrLink(CONFIG.eventLinkPrefix, unwrap(tag.value));
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

  const myNotifications = useMemo(() => {
    return orderDescending([...notifications]).filter(
      a => !isMuted(a.pubkey) && a.tags.some(b => b[0] === "p" && b[1] === login.publicKey),
    );
  }, [notifications, login.publicKey]);

  const timeGrouped = useMemo(() => {
    return myNotifications.reduce((acc, v) => {
      const key = `${timeKey(v)}:${notificationContext(v as TaggedNostrEvent)?.encode()}:${v.kind}`;
      if (acc.has(key)) {
        unwrap(acc.get(key)).push(v as TaggedNostrEvent);
      } else {
        acc.set(key, [v as TaggedNostrEvent]);
      }
      return acc;
    }, new Map<string, Array<TaggedNostrEvent>>());
  }, [myNotifications]);

  return (
    <div className="main-content">
      <NotificationSummary evs={myNotifications as TaggedNostrEvent[]} />

      {login.publicKey &&
        [...timeGrouped.entries()].map(([k, g]) => <NotificationGroup key={k} evs={g} onClick={onClick} />)}
    </div>
  );
}

interface StatSlot {
  time: string;
  reactions: number;
  reposts: number;
  quotes: number;
  mentions: number;
  zaps: number;
}

const enum NotificationSummaryPeriod {
  Daily,
  Weekly,
}

const enum NotificationSummaryFilter {
  Reactions = 1,
  Reposts = 2,
  Mentions = 4,
  Zaps = 8,
  All = 255,
}

function NotificationSummary({ evs }: { evs: Array<TaggedNostrEvent> }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [period, setPeriod] = useState(NotificationSummaryPeriod.Daily);
  const [filter, setFilter] = useState(NotificationSummaryFilter.All);

  const periodTabs = [
    {
      value: NotificationSummaryPeriod.Daily,
      text: <FormattedMessage defaultMessage="Daily" />,
    },
    {
      value: NotificationSummaryPeriod.Weekly,
      text: <FormattedMessage defaultMessage="Weekly" />,
    },
  ] as Array<Tab>;

  const hasFlag = (v: number, f: NotificationSummaryFilter) => {
    return (v & f) > 0;
  };

  const getWeek = (d: Date) => {
    const onejan = new Date(d.getFullYear(), 0, 1);
    const today = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayOfYear = (today.getTime() - onejan.getTime() + 86400000) / 86400000;
    return Math.ceil(dayOfYear / 7);
  };

  const stats = useMemo(() => {
    return orderAscending(evs)
      .filter(a => (period === NotificationSummaryPeriod.Daily ? a.created_at > unixNow() - 14 * Day : true))
      .reduce(
        (acc, v) => {
          const date = new Date(v.created_at * 1000);
          const key =
            period === NotificationSummaryPeriod.Daily
              ? `${date.getMonth() + 1}/${date.getDate()}`
              : getWeek(date).toString();
          acc[key] ??= {
            time: key,
            reactions: 0,
            reposts: 0,
            quotes: 0,
            mentions: 0,
            zaps: 0,
          };

          if (v.kind === EventKind.Reaction) {
            acc[key].reactions++;
          } else if (v.kind === EventKind.Repost) {
            acc[key].reposts++;
          } else if (v.kind === EventKind.ZapReceipt) {
            acc[key].zaps++;
          }
          if (v.kind === EventKind.TextNote) {
            acc[key].mentions++;
          }

          return acc;
        },
        {} as Record<string, StatSlot>,
      );
  }, [evs, period]);

  const filterIcon = (f: NotificationSummaryFilter, icon: string, iconActiveClass: string) => {
    const active = hasFlag(filter, f);
    return (
      <AsyncIcon
        className={classNames("button-icon-sm transparent", { active, [iconActiveClass]: active })}
        onClick={() => setFilter(v => v ^ f)}
        name={""}
        iconName={icon}
      />
    );
  };

  return (
    <div className="flex flex-col g12 p bb">
      <div className="flex justify-between">
        <h2>
          <FormattedMessage defaultMessage="Summary" description="Notifications summary" />
        </h2>
        <div className="flex items-center g8">
          {filterIcon(NotificationSummaryFilter.Reactions, "heart-solid", "text-heart")}
          {filterIcon(NotificationSummaryFilter.Zaps, "zap-solid", "text-zap")}
          {filterIcon(NotificationSummaryFilter.Reposts, "reverse-left", "text-repost")}
          {filterIcon(NotificationSummaryFilter.Mentions, "at-sign", "text-mention")}
        </div>
      </div>
      <Tabs tabs={periodTabs} tab={unwrap(periodTabs.find(a => a.value === period))} setTab={t => setPeriod(t.value)} />
      <div ref={ref}>
        <BarChart
          width={ref.current?.clientWidth}
          height={200}
          data={Object.values(stats)}
          margin={{ left: 0, right: 0 }}
          style={{ userSelect: "none" }}>
          <XAxis dataKey="time" />
          <YAxis />
          {hasFlag(filter, NotificationSummaryFilter.Reactions) && (
            <Bar dataKey="reactions" fill="var(--heart)" stackId="" />
          )}
          {hasFlag(filter, NotificationSummaryFilter.Reposts) && (
            <Bar dataKey="reposts" fill="var(--repost)" stackId="" />
          )}
          {hasFlag(filter, NotificationSummaryFilter.Mentions) && (
            <Bar dataKey="mentions" fill="var(--mention)" stackId="" />
          )}
          {hasFlag(filter, NotificationSummaryFilter.Zaps) && <Bar dataKey="zaps" fill="var(--zap)" stackId="" />}
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.2)" }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="summary-tooltip">
                    <div className="flex flex-col g12">
                      <Icon name="heart-solid" className="text-heart" />
                      {formatShort(payload.find(a => a.name === "reactions")?.value as number)}
                    </div>
                    <div className="flex flex-col g12">
                      <Icon name="zap-solid" className="text-zap" />
                      {formatShort(payload.find(a => a.name === "zaps")?.value as number)}
                    </div>
                    <div className="flex flex-col g12">
                      <Icon name="reverse-left" className="text-repost" />
                      {formatShort(payload.find(a => a.name === "reposts")?.value as number)}
                    </div>
                    <div className="flex flex-col g12">
                      <Icon name="at-sign" className="text-mention" />
                      {formatShort(payload.find(a => a.name === "mentions")?.value as number)}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
        </BarChart>
      </div>
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
                    navigate(`/${context.encode()}`);
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
