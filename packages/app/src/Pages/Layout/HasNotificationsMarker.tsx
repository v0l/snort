import { useMemo } from 'react'

import { useNotificationsView } from '@/Feed/WorkerRelayView'
import useLogin from '@/Hooks/useLogin'

export function HasNotificationsMarker() {
  const readNotifications = useLogin(s => s.readNotifications)
  const notifications = useNotificationsView()
  const latestNotification = useMemo(
    () => notifications.reduce((acc, n) => Math.max(acc, n.created_at), 0),
    [notifications],
  )
  const hasNotifications = latestNotification * 1000 > readNotifications

  if (hasNotifications) {
    return (
      <div className="relative">
        <span className="has-unread absolute top-0 right-0 rounded-full"></span>
      </div>
    )
  }
}
