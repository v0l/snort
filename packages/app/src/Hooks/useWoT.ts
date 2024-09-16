import { TaggedNostrEvent } from "@snort/system";
import { socialGraphInstance } from "@snort/system/dist/SocialGraph/SocialGraph";

export default function useWoT() {
  const sg = socialGraphInstance;
  return {
    sortEvents: (events: Array<TaggedNostrEvent>) =>
      events.sort((a, b) => sg.getFollowDistance(a.pubkey) - sg.getFollowDistance(b.pubkey)),
    followDistance: sg.getFollowDistance,
  };
}
