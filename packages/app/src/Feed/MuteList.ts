import { useMemo } from "react";
import { useSelector } from "react-redux";

import { getNewest } from "Util";
import { HexKey, TaggedRawEvent, Lists, EventKind } from "@snort/nostr";

import { RootState } from "State/Store";
import { ParameterizedReplaceableNoteStore, RequestBuilder } from "System";
import useRequestBuilder from "Hooks/useRequestBuilder";

export default function useMutedFeed(pubkey?: HexKey) {
  const { publicKey, muted } = useSelector((s: RootState) => s.login);
  const isMe = publicKey === pubkey;

  const sub = useMemo(() => {
    if (isMe || !pubkey) return null;
    const b = new RequestBuilder(`muted:${pubkey.slice(0, 12)}`);
    b.withFilter().authors([pubkey]).kinds([EventKind.PubkeyLists]).tag("d", [Lists.Muted]);
    return b;
  }, [pubkey]);

  const mutedFeed = useRequestBuilder<ParameterizedReplaceableNoteStore>(ParameterizedReplaceableNoteStore, sub);

  const mutedList = useMemo(() => {
    if (pubkey && mutedFeed.data) {
      return getMuted(mutedFeed.data, pubkey);
    }
    return [];
  }, [mutedFeed, pubkey]);

  return isMe ? muted : mutedList;
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

export function getMuted(feed: readonly TaggedRawEvent[], pubkey: HexKey): HexKey[] {
  const lists = feed.filter(a => a.kind === EventKind.PubkeyLists && a.pubkey === pubkey);
  return getMutedKeys(lists).keys;
}
