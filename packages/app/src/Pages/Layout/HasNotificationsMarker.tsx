import { useMemo } from "react"

import { useChatSystems } from "@/chat"
import { useNotificationsView } from "@/Feed/WorkerRelayView"
import useLogin from "@/Hooks/useLogin"

export function useUnreadNotifications() {
  const readNotifications = useLogin(s => s.readNotifications)
  const notifications = useNotificationsView()
  return useMemo(
    () => notifications.filter(n => n.created_at * 1000 > readNotifications).length,
    [notifications, readNotifications],
  )
}

export function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span
      aria-hidden="true"
      className="absolute -top-1 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[11px] font-bold leading-[18px] text-center"
    >
      {count > 99 ? "99+" : count}
    </span>
  )
}

export function HasNotificationsMarker() {
  const count = useUnreadNotifications()
  return <CountBadge count={count} />
}

export function UnreadMessages() {
  const chats = useChatSystems()
  const count = useMemo(() => chats.reduce((acc, c) => acc + (c.unread > 0 ? 1 : 0), 0), [chats])
  return <CountBadge count={count} />
}
