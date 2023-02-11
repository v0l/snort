import { useMemo } from "react";

import { getNewest } from "Util";
import { HexKey, TaggedRawEvent, Lists } from "@snort/nostr";
import { EventKind, Subscriptions } from "@snort/nostr";
import useSubscription, { NoteStore } from "Feed/Subscription";

export default function useMutedFeed(pubkey: HexKey) {
  const sub = useMemo(() => {
    const sub = new Subscriptions();
    sub.Id = `muted:${pubkey.slice(0, 12)}`;
    sub.Kinds = new Set([EventKind.PubkeyLists]);
    sub.Authors = new Set([pubkey]);
    sub.DTags = new Set([Lists.Muted]);
    sub.Limit = 1;
    return sub;
  }, [pubkey]);

  return useSubscription(sub);
}

export function getMutedKeys(rawNotes: TaggedRawEvent[]): {
  createdAt: number;
  keys: HexKey[];
} {
  const newest = getNewest(rawNotes);
  if (newest) {
    const { created_at, tags } = newest;
    const keys = tags.filter(t => t[0] === "p").map(t => t[1]);
    return {
      keys,
      createdAt: created_at,
    };
  }
  return { createdAt: 0, keys: [] };
}

export function getMuted(feed: NoteStore, pubkey: HexKey): HexKey[] {
  const lists = feed?.notes.filter(a => a.kind === EventKind.PubkeyLists && a.pubkey === pubkey);
  return getMutedKeys(lists).keys;
}
