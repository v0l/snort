import { useSelector } from "react-redux";

import { RootState } from "State/Store";
import { HexKey, Lists } from "@snort/nostr";
import useNotelistSubscription from "Feed/useNotelistSubscription";

export default function useBookmarkFeed(pubkey?: HexKey) {
  const { bookmarked } = useSelector((s: RootState) => s.login);
  return useNotelistSubscription(pubkey, Lists.Bookmarked, bookmarked);
}
