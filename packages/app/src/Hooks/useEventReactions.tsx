import { EventKind, NostrLink, parseZap, TaggedNostrEvent } from "@snort/system";
import { UserCache } from "Cache";
import { useMemo } from "react";
import { dedupeByPubkey, getLinkReactions, normalizeReaction, Reaction } from "SnortUtils";

export function useEventReactions(ev: TaggedNostrEvent, related: ReadonlyArray<TaggedNostrEvent>) {
  return useMemo(() => {
    const link = NostrLink.fromEvent(ev);
    const deletions = getLinkReactions(related, link, EventKind.Deletion);
    const reactions = getLinkReactions(related, link, EventKind.Reaction);
    const reposts = getLinkReactions(related, link, EventKind.Repost);

    const groupReactions = (() => {
      const result = reactions?.reduce(
        (acc, reaction) => {
          const kind = normalizeReaction(reaction.content);
          const rs = acc[kind] || [];
          return { ...acc, [kind]: [...rs, reaction] };
        },
        {
          [Reaction.Positive]: [] as TaggedNostrEvent[],
          [Reaction.Negative]: [] as TaggedNostrEvent[],
        },
      );
      return {
        [Reaction.Positive]: dedupeByPubkey(result[Reaction.Positive]),
        [Reaction.Negative]: dedupeByPubkey(result[Reaction.Negative]),
      };
    })();
    const positive = groupReactions[Reaction.Positive];
    const negative = groupReactions[Reaction.Negative];

    const zaps = getLinkReactions(related, link, EventKind.ZapReceipt)
      .map(a => parseZap(a, UserCache, ev))
      .filter(a => a.valid)
      .sort((a, b) => b.amount - a.amount);

    return {
      deletions,
      reactions: {
        all: reactions,
        positive,
        negative,
      },
      reposts,
      zaps,
    };
  }, [ev, related]);
}
