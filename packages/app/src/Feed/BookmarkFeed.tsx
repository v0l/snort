import { HexKey, Lists } from "System";

import useNotelistSubscription from "Hooks/useNotelistSubscription";
import useLogin from "Hooks/useLogin";

export default function useBookmarkFeed(pubkey?: HexKey) {
  const { bookmarked } = useLogin();
  return useNotelistSubscription(pubkey, Lists.Bookmarked, bookmarked.item);
}
