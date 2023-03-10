import { useSelector } from "react-redux";
import { HexKey, Lists } from "@snort/nostr";

import { RootState } from "State/Store";
import useNotelistSubscription from "Hooks/useNotelistSubscription";

export default function useBookmarkFeed(pubkey?: HexKey) {
  const { bookmarked } = useSelector((s: RootState) => s.login);
  return useNotelistSubscription(pubkey, Lists.Bookmarked, bookmarked);
}
