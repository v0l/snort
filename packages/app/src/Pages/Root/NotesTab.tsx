import { NostrEvent, NostrLink } from "@snort/system";
import { useContext, useMemo } from "react";

import TimelineFollows from "@/Components/Feed/TimelineFollows";
import { TaskList } from "@/Components/Tasks/TaskList";
import { DeckContext } from "@/Pages/Deck/DeckLayout";

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
      <TaskList />
      <TimelineFollows postsOnly={true} noteOnClick={noteOnClick} />
    </>
  );
};
