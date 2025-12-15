import { NostrEvent, NostrLink } from "@snort/system";
import { use, useMemo } from "react";

import TimelineFollows from "@/Components/Feed/TimelineFollows";
import { DeckContext } from "@/Pages/Deck/DeckLayout";

export const NotesTab = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const deckContext = use(DeckContext);

  const noteOnClick = useMemo(() => {
    if (deckContext) {
      return (ev: NostrEvent) => {
        deckContext.setThread(NostrLink.fromEvent(ev));
      };
    }
    return undefined;
  }, [deckContext]);

  return <TimelineFollows postsOnly={true} noteOnClick={noteOnClick} />;
};
