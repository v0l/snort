import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { HexKey } from "@snort/nostr";
import { markNotificationsRead } from "State/Login";
import { RootState } from "State/Store";
import Timeline from "Element/Timeline";
import { TaskList } from "Tasks/TaskList";

export default function NotificationsPage() {
  const dispatch = useDispatch();
  const pubkey = useSelector<RootState, HexKey | undefined>(s => s.login.publicKey);

  useEffect(() => {
    dispatch(markNotificationsRead());
  }, []);

  return (
    <>
      <div className="main-content">
        <TaskList />
      </div>
      {pubkey && (
        <Timeline
          subject={{
            type: "ptag",
            items: [pubkey],
            discriminator: pubkey.slice(0, 12),
          }}
          postsOnly={false}
          method={"TIME_RANGE"}
        />
      )}
    </>
  );
}
