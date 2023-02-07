import { useMemo } from "react";

import { HexKey, TaggedRawEvent, Lists } from "Nostr";
import EventKind from "Nostr/EventKind";
import { Subscriptions } from "Nostr/Subscriptions";
import useSubscription, { NoteStore } from "Feed/Subscription";

export default function useMutedFeed(pubkey: HexKey) {
  const sub = useMemo(() => {
    const sub = new Subscriptions();
    sub.Id = `muted:${pubkey.slice(0, 12)}`;
    sub.Kinds = new Set([EventKind.Lists]);
    sub.Authors = new Set([pubkey]);
    sub.DTags = new Set([Lists.Muted]);
    sub.Limit = 1;
    return sub;
  }, [pubkey]);

  return useSubscription(sub);
}

export function getNewest(rawNotes: TaggedRawEvent[]) {
  const notes = [...rawNotes];
  notes.sort((a, b) => a.created_at - b.created_at);
  if (notes.length > 0) {
    return notes[0];
  }
}

export function getMutedKeys(rawNotes: TaggedRawEvent[]): {
  createdAt: number;
  keys: HexKey[];
} {
  const newest = getNewest(rawNotes);
  if (newest) {
    const { created_at, tags } = newest;
    const keys = tags.filter((t) => t[0] === "p").map((t) => t[1]);
    return {
      keys,
      createdAt: created_at,
    };
  }
  return { createdAt: 0, keys: [] };
}

export function getMuted(feed: NoteStore, pubkey: HexKey): HexKey[] {
  const lists = feed?.notes.filter(
    (a) => a.kind === EventKind.Lists && a.pubkey === pubkey
  );
  return getMutedKeys(lists).keys;
}
