import { useMemo } from "react";
import useFollowsControls from "./useFollowControls";
import { EventExt, EventKind, NostrLink, RequestBuilder, type TaggedNostrEvent } from "@snort/system";
import { useEventsFeed, useRequestBuilder } from "@snort/system-react";
import { dedupe } from "@snort/shared";

export function useBlindSpot(count = 10) {
  const { followList, pubkey } = useFollowsControls();
  const rbReactions = useMemo(() => {
    const rb = new RequestBuilder("follows-reactions");
    if (followList.length > 0) {
      rb.withFilter().authors(followList).kinds([EventKind.Reaction, EventKind.Repost]).limit(50);
      rb.withFilter().tag("P", followList).kinds([EventKind.ZapReceipt]).limit(50);
    }
    return rb;
  }, [followList]);

  const reactions = useRequestBuilder(rbReactions);

  // compute the list of targets (target) => Reaction Events
  const targets = useMemo(() => {
    const res = reactions
      .map(a => ({ links: NostrLink.replyTags(a.tags), event: a }))
      .reduce(
        (acc, v) => {
          for (const link of v.links) {
            acc[link.tagKey] ??= {
              link,
              events: [],
            };
            acc[link.tagKey].events.push(v.event);
          }
          return acc;
        },
        {} as Record<string, { link: NostrLink; events: Array<TaggedNostrEvent> }>,
      );

    // filter events which we also reacted to
    // filter targets which have more than 1 pubkey reacting to it
    return Object.values(res).filter(
      a => dedupe(a.events.map(c => EventExt.getRootPubKey(c))).length > 1 && !a.events.some(b => b.pubkey === pubkey),
    );
  }, [reactions, pubkey]);

  // select the top N reactions
  const topNReactions = useMemo(() => {
    return targets
      .sort((a, b) => (b.events.length < a.events.length ? -1 : 1))
      .slice(0, count)
      .map(a => a.link);
  }, [targets, count]);

  return useEventsFeed("follows-reactions-events", topNReactions);
}
