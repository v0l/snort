import { useSelector } from "react-redux";

import { RootState } from "State/Store";
import { HexKey, Lists } from "@snort/nostr";
import useNotelistSubscription from "Feed/useNotelistSubscription";

export default function usePinnedFeed(pubkey: HexKey) {
  const { pinned } = useSelector((s: RootState) => s.login);
  return useNotelistSubscription(pubkey, Lists.Pinned, pinned);
}
