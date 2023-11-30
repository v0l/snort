import useLogin from "@/Hooks/useLogin";
import { useMemo, useSyncExternalStore } from "react";
import { Notifications } from "@/Cache";

export function HasNotificationsMarker() {
  const readNotifications = useLogin(s => s.readNotifications);
  const notifications = useSyncExternalStore(
    c => Notifications.hook(c, "*"),
    () => Notifications.snapshot(),
  );
  const latestNotification = useMemo(
    () => notifications.reduce((acc, v) => (v.created_at > acc ? v.created_at : acc), 0),
    [notifications],
  );
  const hasNotifications = useMemo(
    () => latestNotification * 1000 > readNotifications,
    [notifications, readNotifications],
  );

  if (hasNotifications) {
    return (
      <div className="relative">
        <span className="has-unread absolute top-0 right-0 rounded-full"></span>
      </div>
    );
  }
}
