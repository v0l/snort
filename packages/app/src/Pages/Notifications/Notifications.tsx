import { unwrap } from "@snort/shared"
import { EventKind, type NostrEvent, type NostrLink, type TaggedNostrEvent } from "@snort/system"
import classNames from "classnames"
import { useEffect, useMemo, useState } from "react"

import { AsyncIcon } from "@/Components/Button/AsyncIcon"
import { AutoLoadMore } from "@/Components/Event/LoadMore"
import { useNotificationsView } from "@/Feed/WorkerRelayView"
import useLogin from "@/Hooks/useLogin"
import useModeration from "@/Hooks/useModeration"
import { markNotificationsRead, LoginStore } from "@/Utils/Login"

import { getNotificationContext } from "./getNotificationContext"
import { NotificationGroup } from "./NotificationGroup"

enum NotificationSummaryFilter {
  Reactions = 1,
  Reposts = 2,
  Mentions = 4,
  Zaps = 8,
  All = 255,
}

const hasFlag = (v: number, f: NotificationSummaryFilter) => {
  return (v & f) > 0
}

const groupInterval = 3600 * 6

const timeKey = (ev: NostrEvent) => {
  const onHour = ev.created_at - (ev.created_at % groupInterval)
  return onHour.toString()
}

function FilterIcon({
  f,
  icon,
  iconActiveClass,
  filter,
  setFilter,
}: {
  f: NotificationSummaryFilter
  icon: string
  iconActiveClass: string
  filter: number
  setFilter: (fn: (v: number) => number) => void
}) {
  const active = hasFlag(filter, f)
  return (
    <AsyncIcon
      className={classNames("button-icon-sm transparent", { active, [iconActiveClass]: active })}
      onClick={() => setFilter(v => v ^ f)}
      name={""}
      iconName={icon}
    />
  )
}

export default function NotificationsPage({ onClick }: { onClick?: (link: NostrLink) => void }) {
  const login = useLogin()

  useEffect(() => {
    markNotificationsRead(LoginStore.snapshot())
  }, [login.publicKey])

  const notifications = useNotificationsView()

  const myNotifications = useMemo(() => {
    return notifications
      .sort((a, b) => (a.created_at > b.created_at ? -1 : 1))
      .slice(0, limit)
      .filter(a => !isMuted(a.pubkey) && a.tags.some(b => b[0] === "p" && b[1] === login.publicKey))
      .filter(a => {
        if (a.kind === EventKind.TextNote) {
          return hasFlag(filter, NotificationSummaryFilter.Mentions)
        } else if (a.kind === EventKind.Reaction) {
          return hasFlag(filter, NotificationSummaryFilter.Reactions)
        } else if (a.kind === EventKind.Repost) {
          return hasFlag(filter, NotificationSummaryFilter.Reposts)
        } else if (a.kind === EventKind.ZapReceipt) {
          return hasFlag(filter, NotificationSummaryFilter.Zaps)
        }
        return true
      })
  }, [notifications, login.publicKey, limit, filter, isMuted])

  const timeGrouped = useMemo(() => {
    return myNotifications.reduce((acc, v) => {
      const key = `${timeKey(v)}:${getNotificationContext(v)?.encode()}:${v.kind}`
      if (acc.has(key)) {
        unwrap(acc.get(key)).push(v)
      } else {
        acc.set(key, [v])
      }
      return acc
    }, new Map<string, Array<TaggedNostrEvent>>())
  }, [myNotifications])

  return (
    <div>
      <div className="flex justify-between items-center mx-1">
        <div></div>
        <div className="flex items-center gap-2">
          <FilterIcon
            f={NotificationSummaryFilter.Reactions}
            icon="heart-solid"
            iconActiveClass="text-heart"
            filter={filter}
            setFilter={setFilter}
          />
          <FilterIcon
            f={NotificationSummaryFilter.Zaps}
            icon="zap-solid"
            iconActiveClass="text-zap"
            filter={filter}
            setFilter={setFilter}
          />
          <FilterIcon
            f={NotificationSummaryFilter.Reposts}
            icon="repeat"
            iconActiveClass="text-repost"
            filter={filter}
            setFilter={setFilter}
          />
          <FilterIcon
            f={NotificationSummaryFilter.Mentions}
            icon="at-sign"
            iconActiveClass="text-mention"
            filter={filter}
            setFilter={setFilter}
          />
        </div>
      </div>

      {login.publicKey &&
        [...timeGrouped.entries()].map(([k, g]) => <NotificationGroup key={k} evs={g} onClick={onClick} />)}

      <AutoLoadMore
        onClick={() => {
          setLimit(l => l + 100)
        }}
      />
    </div>
  )
}
