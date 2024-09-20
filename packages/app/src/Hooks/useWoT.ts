import { socialGraphInstance, TaggedNostrEvent } from "@snort/system";
import { useMemo } from "react";

export default function useWoT() {
  return useMemo(
    () => ({
      sortEvents: (events: Array<TaggedNostrEvent>) =>
        events.sort(
          (a, b) => socialGraphInstance.getFollowDistance(a.pubkey) - socialGraphInstance.getFollowDistance(b.pubkey),
        ),
      followDistance: (pk: string) => socialGraphInstance.getFollowDistance(pk),
    }),
    [socialGraphInstance.root],
  );
}
