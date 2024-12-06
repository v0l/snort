import { useMemo } from "react";

import useLogin from "@/Hooks/useLogin";

export function HasNotificationsMarker() {
  const readNotifications = useLogin(s => s.readNotifications);
  const latestNotification = 0; // TODO: get latest timestamp
  const hasNotifications = useMemo(() => latestNotification * 1000 > readNotifications, [readNotifications]);

  if (hasNotifications) {
    return (
      <div className="relative">
        <span className="has-unread absolute top-0 right-0 rounded-full"></span>
      </div>
    );
  }
}
