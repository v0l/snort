import { useMemo } from "react";
import { HexKey, TaggedRawEvent, Lists, EventKind } from "System";

import { getNewest } from "SnortUtils";
import { ParameterizedReplaceableNoteStore, RequestBuilder } from "System";
import useRequestBuilder from "Hooks/useRequestBuilder";
import useLogin from "Hooks/useLogin";

export default function useMutedFeed(pubkey?: HexKey) {
  const { publicKey, muted } = useLogin();
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

  return isMe ? muted.item : mutedList;
}

export function getMutedKeys(rawNotes: TaggedRawEvent[]): {
  createdAt: number;
  keys: HexKey[];
  raw?: TaggedRawEvent;
} {
  const newest = getNewest(rawNotes);
  if (newest) {
    const { created_at, tags } = newest;
    const keys = tags.filter(t => t[0] === "p").map(t => t[1]);
    return {
      raw: newest,
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
