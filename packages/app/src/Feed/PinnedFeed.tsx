import { HexKey, Lists } from "@snort/system";
import useNotelistSubscription from "Hooks/useNotelistSubscription";
import useLogin from "Hooks/useLogin";

export default function usePinnedFeed(pubkey?: HexKey) {
  const pinned = useLogin().pinned.item;
  return useNotelistSubscription(pubkey, Lists.Pinned, pinned);
}
