import type { SystemInterface, TaggedNostrEvent } from "@snort/system";
import { SnortContext } from "@snort/system-react";
import { use, useMemo } from "react";

export interface WoT {
  sortEvents: (events: Array<TaggedNostrEvent>) => Array<TaggedNostrEvent>;
  sortPubkeys: (events: Array<string>) => Array<string>;
  followDistance: (pk: string) => number;
  followedByCount: (pk: string) => number;
  followedBy: (pk: string) => Set<string>;
}

function wotOnSystem(system: SystemInterface) {
  const sgi = system.config.socialGraphInstance;
  return {
    sortEvents: (events: Array<TaggedNostrEvent>) =>
      events.sort((a, b) => sgi.getFollowDistance(a.pubkey) - sgi.getFollowDistance(b.pubkey)),
    sortPubkeys: (events: Array<string>) => events.sort((a, b) => sgi.getFollowDistance(a) - sgi.getFollowDistance(b)),
    followDistance: (pk: string) => sgi.getFollowDistance(pk),
    followedByCount: (pk: string) => sgi.followedByFriendsCount(pk),
    followedBy: (pk: string) => sgi.followedByFriends(pk),
    instance: sgi,
  };
}

export default function useWoT() {
  const system = use(SnortContext);
  return useMemo<WoT>(() => wotOnSystem(system), [system]);
}
