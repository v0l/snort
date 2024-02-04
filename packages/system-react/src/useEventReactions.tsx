import { useMemo } from "react";
import { normalizeReaction, Reaction } from "@snort/shared";
import { EventKind, NostrLink, parseZap, TaggedNostrEvent } from "@snort/system";

/**
 * Parse reactions to a given event from a set of related events
 * @param link Reactions to linked event
 * @param related
 * @returns
 */
export function useEventReactions(link: NostrLink, related: ReadonlyArray<TaggedNostrEvent>) {
  return useMemo(() => {
    const reactionKinds = related.reduce(
      (acc, v) => {
        if (link.isReplyToThis(v)) {
          acc[v.kind.toString()] ??= [];
          acc[v.kind.toString()].push(v);
        }
        return acc;
      },
      {} as Record<string, Array<TaggedNostrEvent>>,
    );

    const deletions = reactionKinds[String(EventKind.Deletion)] ?? [];
    const reactions = reactionKinds[String(EventKind.Reaction)] ?? [];
    const reposts = reactionKinds[String(EventKind.Repost)] ?? [];

    const groupReactions = reactions?.reduce(
      (acc, reaction) => {
        const kind = normalizeReaction(reaction.content);
        acc[kind] ??= [];
        acc[kind].push(reaction);
        return acc;
      },
      {} as Record<Reaction, Array<TaggedNostrEvent>>,
    );

    const zaps = (reactionKinds[String(EventKind.ZapReceipt)] ?? [])
      .map(a => parseZap(a))
      .filter(a => a.valid)
      .sort((a, b) => b.amount - a.amount);

    return {
      deletions,
      reactions: {
        all: reactions,
        positive: groupReactions[Reaction.Positive] ?? [],
        negative: groupReactions[Reaction.Negative] ?? [],
      },
      replies: reactionKinds[String(EventKind.TextNote)] ?? [],
      reposts,
      zaps,
      others: Object.fromEntries(
        Object.entries(reactionKinds).filter(
          ([k]) =>
            ![EventKind.Deletion, EventKind.Reaction, EventKind.Repost, EventKind.ZapReceipt].includes(Number(k)),
        ),
      ),
    };
  }, [link, related]);
}
