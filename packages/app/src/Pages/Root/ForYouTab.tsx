import { TaggedNostrEvent } from "@snort/system";
import { useContext, useEffect, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

import { TimelineRenderer } from "@/Components/Feed/TimelineRenderer";
import { TaskList } from "@/Components/Tasks/TaskList";
import useLogin from "@/Hooks/useLogin";
import { DeckContext } from "@/Pages/DeckLayout";
import messages from "@/Pages/messages";
import { indexedDBWorker } from "@/system";

const FollowsHint = () => {
  const { publicKey: pubKey, follows } = useLogin();
  if (follows.item?.length === 0 && pubKey) {
    return (
      <FormattedMessage
        {...messages.NoFollows}
        values={{
          newUsersPage: (
            <Link to={"/discover"}>
              <FormattedMessage {...messages.NewUsers} />
            </Link>
          ),
        }}
      />
    );
  }
  return null;
};

export const ForYouTab = () => {
  const [notes, setNotes] = useState<TaggedNostrEvent[]>([]);
  const { publicKey } = useLogin();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const deckContext = useContext(DeckContext);

  useEffect(() => {
    indexedDBWorker.getForYouFeed(publicKey).then(setNotes);
  }, []);

  const frags = useMemo(() => {
    return [
      {
        events: notes,
        refTime: Date.now(),
      },
    ];
  }, [notes]);

  return (
    <>
      <FollowsHint />
      <TaskList />
      <TimelineRenderer frags={frags} latest={[]} />
    </>
  );
};
