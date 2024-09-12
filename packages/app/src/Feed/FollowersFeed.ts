import { EventKind, HexKey, RequestBuilder, socialGraphInstance } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";

export default function useFollowersFeed(pubkey?: HexKey) {
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
    return [...new Set(contactLists?.map(a => a.pubkey))].sort((a, b) => {
      return socialGraphInstance.getFollowDistance(a) - socialGraphInstance.getFollowDistance(b);
    });
  }, [followersFeed, pubkey]);

  return followers;
}
