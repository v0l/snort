import { ExternalStore, unwrap } from "@snort/shared";
import { EventKind, parseNostrLink } from "@snort/system";
import { useEffect, useSyncExternalStore } from "react";

import { useLinkList } from "./useLists";

class CommunityLeadersStore extends ExternalStore<Array<string>> {
  #leaders: Array<string> = [];

  setLeaders(arr: Array<string>) {
    this.#leaders = arr;
    this.notifyChange();
  }

  takeSnapshot(): string[] {
    return [...this.#leaders];
  }
}

const LeadersStore = new CommunityLeadersStore();

export function useCommunityLeaders() {
  const link = parseNostrLink(unwrap(CONFIG.communityLeaders).list);

  const list = useLinkList("leaders", rb => {
    rb.withFilter().kinds([EventKind.FollowSet]).link(link);
  });

  useEffect(() => {
    console.debug("CommunityLeaders", list);
    LeadersStore.setLeaders(list.map(a => a.id));
  }, [list]);
}

export function useCommunityLeader(pubkey?: string) {
  const store = useSyncExternalStore(
    c => LeadersStore.hook(c),
    () => LeadersStore.snapshot(),
  );

  return pubkey && store.includes(pubkey);
}
