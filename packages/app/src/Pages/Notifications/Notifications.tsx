import { unwrap } from "@snort/shared";
import { EventKind, NostrEvent, NostrLink, TaggedNostrEvent } from "@snort/system";
import classNames from "classnames";
import { useEffect, useMemo, useState } from "react";

import { AsyncIcon } from "@/Components/Button/AsyncIcon";
import { AutoLoadMore } from "@/Components/Event/LoadMore";
import { useNotificationsView } from "@/Feed/WorkerRelayView";
import useLogin from "@/Hooks/useLogin";
import useModeration from "@/Hooks/useModeration";
import { markNotificationsRead } from "@/Utils/Login";

import { getNotificationContext } from "./getNotificationContext";
import { NotificationGroup } from "./NotificationGroup";

const enum NotificationSummaryFilter {
  Reactions = 1,
  Reposts = 2,
  Mentions = 4,
  Zaps = 8,
  All = 255,
}

export default function NotificationsPage({ onClick }: { onClick?: (link: NostrLink) => void }) {
  const login = useLogin();
  const { isMuted } = useModeration();
  const groupInterval = 3600 * 6;
  const [limit, setLimit] = useState(100);
  const [filter, setFilter] = useState(NotificationSummaryFilter.All);

  useEffect(() => {
    markNotificationsRead(login);
  }, []);

  const notifications = useNotificationsView();

  const hasFlag = (v: number, f: NotificationSummaryFilter) => {
    return (v & f) > 0;
  };

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

  const timeKey = (ev: NostrEvent) => {
    const onHour = ev.created_at - (ev.created_at % groupInterval);
    return onHour.toString();
  };

  const myNotifications = useMemo(() => {
    return notifications
      .sort((a, b) => (a.created_at > b.created_at ? -1 : 1))
      .slice(0, limit)
      .filter(a => !isMuted(a.pubkey) && a.tags.some(b => b[0] === "p" && b[1] === login.publicKey))
      .filter(a => {
        if (a.kind === EventKind.TextNote) {
          return hasFlag(filter, NotificationSummaryFilter.Mentions);
        } else if (a.kind === EventKind.Reaction) {
          return hasFlag(filter, NotificationSummaryFilter.Reactions);
        } else if (a.kind === EventKind.Repost) {
          return hasFlag(filter, NotificationSummaryFilter.Reposts);
        } else if (a.kind === EventKind.ZapReceipt) {
          return hasFlag(filter, NotificationSummaryFilter.Zaps);
        }
        return true;
      });
  }, [notifications, login.publicKey, limit, filter]);

  const timeGrouped = useMemo(() => {
    return myNotifications.reduce((acc, v) => {
      const key = `${timeKey(v)}:${getNotificationContext(v)?.encode()}:${v.kind}`;
      if (acc.has(key)) {
        unwrap(acc.get(key)).push(v);
      } else {
        acc.set(key, [v]);
      }
      return acc;
    }, new Map<string, Array<TaggedNostrEvent>>());
  }, [myNotifications]);

  return (
    <>
      <div>
        <div className="flex justify-between items-center mx-1">
          <div></div>
          <div className="flex items-center gap-2">
            {filterIcon(NotificationSummaryFilter.Reactions, "heart-solid", "text-heart")}
            {filterIcon(NotificationSummaryFilter.Zaps, "zap-solid", "text-zap")}
            {filterIcon(NotificationSummaryFilter.Reposts, "repeat", "text-repost")}
            {filterIcon(NotificationSummaryFilter.Mentions, "at-sign", "text-mention")}
          </div>
        </div>

        {login.publicKey &&
          [...timeGrouped.entries()].map(([k, g]) => <NotificationGroup key={k} evs={g} onClick={onClick} />)}

        <AutoLoadMore
          onClick={() => {
            setLimit(l => l + 100);
          }}
        />
      </div>
    </>
  );
}
