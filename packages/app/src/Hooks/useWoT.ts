import { TaggedNostrEvent } from "@snort/system";
import { SnortContext } from "@snort/system-react";
import { useContext, useMemo } from "react";

export default function useWoT() {
  const system = useContext(SnortContext);
  return useMemo(
    () => ({
      sortEvents: (events: Array<TaggedNostrEvent>) =>
        events.sort(
          (a, b) =>
            system.config.socialGraphInstance.getFollowDistance(a.pubkey) -
            system.config.socialGraphInstance.getFollowDistance(b.pubkey),
        ),
      sortPubkeys: (events: Array<string>) =>
        events.sort(
          (a, b) =>
            system.config.socialGraphInstance.getFollowDistance(a) -
            system.config.socialGraphInstance.getFollowDistance(b),
        ),
      followDistance: (pk: string) => system.config.socialGraphInstance.getFollowDistance(pk),
      followedByCount: (pk: string) => system.config.socialGraphInstance.followedByFriendsCount(pk),
      followedBy: (pk: string) => system.config.socialGraphInstance.followedByFriends(pk),
      instance: system.config.socialGraphInstance,
    }),
    [system.config.socialGraphInstance],
  );
}
