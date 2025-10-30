import { EventKind, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";

import useWoT from "@/Hooks/useWoT";

export default function useFollowersFeed(pubkey?: string) {
  const wot = useWoT();
  const sub = useMemo(() => {
    const b = new RequestBuilder(`followers`);
    if (pubkey) {
      b.withFilter().kinds([EventKind.ContactList]).tag("p", [pubkey]);
    }
    return b;
  }, [pubkey]);

  const followersFeed = useRequestBuilder(sub);

  const followers = useMemo(() => {
    const contactLists = followersFeed?.filter(
      a => a.kind === EventKind.ContactList && a.tags.some(b => b[0] === "p" && b[1] === pubkey),
    );
    return wot.sortEvents(contactLists);
  }, [followersFeed, pubkey]);

  return followers;
}
