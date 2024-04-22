import { NostrEvent, NostrLink } from "@snort/system";
import { useContext, useMemo } from "react";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

import TimelineFollows from "@/Components/Feed/TimelineFollows";
import { TaskList } from "@/Components/Tasks/TaskList";
import useFollowsControls from "@/Hooks/useFollowControls";
import useLogin from "@/Hooks/useLogin";
import { DeckContext } from "@/Pages/Deck/DeckLayout";
import messages from "@/Pages/messages";

const FollowsHint = () => {
  const publicKey = useLogin(s => s.publicKey);
  const { followList } = useFollowsControls();
  if (followList.length === 0 && publicKey) {
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
};

export const NotesTab = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const deckContext = useContext(DeckContext);

  const noteOnClick = useMemo(() => {
    if (deckContext) {
      return (ev: NostrEvent) => {
        deckContext.setThread(NostrLink.fromEvent(ev));
      };
    }
    return undefined;
  }, [deckContext]);

  return (
    <>
      <FollowsHint />
      <TaskList />
      <TimelineFollows postsOnly={true} noteOnClick={noteOnClick} />
    </>
  );
};
