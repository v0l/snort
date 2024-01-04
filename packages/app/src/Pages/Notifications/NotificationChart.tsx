import { Day } from "@/Utils/Const";
import Icon from "@/Components/Icons/Icon";
import { formatShort } from "@/Utils/Number";
import { orderAscending } from "@/Utils";
import { unixNow, unwrap } from "@snort/shared";
import { TaggedNostrEvent, EventKind } from "@snort/system";
import classNames from "classnames";
import { useState, useMemo } from "react";
import { FormattedMessage } from "react-intl";
import { AsyncIcon } from "@/Components/Button/AsyncIcon";
import Tabs, { Tab } from "@/Components/Tabs/Tabs";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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

export default function NotificationSummary({ evs }: { evs: Array<TaggedNostrEvent> }) {
  const [period, setPeriod] = useState(NotificationSummaryPeriod.Daily);
  const [filter, setFilter] = useState(NotificationSummaryFilter.All);

  const periodTabs = [
    {
      value: NotificationSummaryPeriod.Daily,
      text: <FormattedMessage defaultMessage="Daily" id="zxvhnE" />,
    },
    {
      value: NotificationSummaryPeriod.Weekly,
      text: <FormattedMessage defaultMessage="Weekly" id="/clOBU" />,
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

  if (evs.length === 0) return;

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
          <FormattedMessage defaultMessage="Summary" id="PJeJFc" description="Notifications summary" />
        </h2>
        <div className="flex items-center g8">
          {filterIcon(NotificationSummaryFilter.Reactions, "heart-solid", "text-heart")}
          {filterIcon(NotificationSummaryFilter.Zaps, "zap-solid", "text-zap")}
          {filterIcon(NotificationSummaryFilter.Reposts, "reverse-left", "text-repost")}
          {filterIcon(NotificationSummaryFilter.Mentions, "at-sign", "text-mention")}
        </div>
      </div>
      <Tabs tabs={periodTabs} tab={unwrap(periodTabs.find(a => a.value === period))} setTab={t => setPeriod(t.value)} />
      <div>
        <ResponsiveContainer height={200}>
          <BarChart data={Object.values(stats)} margin={{ left: 0, right: 0 }} style={{ userSelect: "none" }}>
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
        </ResponsiveContainer>
      </div>
    </div>
  );
}
