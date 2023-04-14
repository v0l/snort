import { useEffect } from "react";

import Timeline from "Element/Timeline";
import { TaskList } from "Tasks/TaskList";
import useLogin from "Hooks/useLogin";
import { markNotificationsRead } from "Login";

export default function NotificationsPage() {
  const login = useLogin();

  useEffect(() => {
    markNotificationsRead(login);
  }, []);

  return (
    <>
      <div className="main-content">
        <TaskList />
      </div>
      {login.publicKey && (
        <Timeline
          subject={{
            type: "ptag",
            items: [login.publicKey],
            discriminator: login.publicKey.slice(0, 12),
          }}
          postsOnly={false}
          method={"TIME_RANGE"}
        />
      )}
    </>
  );
}
