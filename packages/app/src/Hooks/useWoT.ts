import { socialGraphInstance, TaggedNostrEvent } from "@snort/system";

export default function useWoT() {
  return {
    sortEvents: (events: Array<TaggedNostrEvent>) =>
      events.sort(
        (a, b) => socialGraphInstance.getFollowDistance(a.pubkey) - socialGraphInstance.getFollowDistance(b.pubkey),
      ),
    followDistance: (pk: string) => socialGraphInstance.getFollowDistance(pk),
  };
}
