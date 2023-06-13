import { useEffect, useState } from "react";

import Timeline from "Element/Timeline";
import { TaskList } from "Tasks/TaskList";
import useLogin from "Hooks/useLogin";
import { markNotificationsRead } from "Login";
import { unixNow } from "SnortUtils";

export default function NotificationsPage() {
  const login = useLogin();
  const [now] = useState(unixNow());

  useEffect(() => {
    markNotificationsRead(login);
  }, []);

  return (
    <div className="main-content">
      <TaskList />
      {login.publicKey && (
        <Timeline
          subject={{
            type: "ptag",
            items: [login.publicKey],
            discriminator: login.publicKey.slice(0, 12),
          }}
          now={now}
          window={60 * 60 * 12}
          postsOnly={false}
          method={"TIME_RANGE"}
        />
      )}
    </div>
  );
}
