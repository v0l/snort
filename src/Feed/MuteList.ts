import { useMemo } from "react";
import { useSelector } from "react-redux";

import { HexKey, TaggedRawEvent } from "Nostr";
import EventKind from "Nostr/EventKind";
import { Subscriptions } from "Nostr/Subscriptions";
import type { RootState } from "State/Store";
import useSubscription, { NoteStore } from "Feed/Subscription";

export const MUTE_LIST_TAG = "p:mute"

export default function useMutedFeed(pubkey: HexKey) {
    const loginPubkey = useSelector((s: RootState) => s.login.publicKey)
    const sub = useMemo(() => {
        if (pubkey === loginPubkey) return null

        let sub = new Subscriptions();
        sub.Id = `muted:${pubkey}`;
        sub.Kinds = new Set([EventKind.Lists]);
        sub.Authors = new Set([pubkey]);
        sub.DTags = new Set([MUTE_LIST_TAG])
        sub.Limit = 1;

        return sub;
    }, [pubkey]);

    return useSubscription(sub);
}

export function getMutedKeys(rawNotes: TaggedRawEvent[]): { at: number, keys: HexKey[] } {
    const notes = [...rawNotes]
    notes.sort((a, b) => a.created_at - b.created_at)
    const newest = notes && notes[0]
    if (newest) {
        const { tags } = newest
        const mutedIndex = tags.findIndex(t => t[0] === "d" && t[1] === MUTE_LIST_TAG)
        if (mutedIndex !== -1) {
             return {
               at: newest.created_at,
               keys: tags.slice(mutedIndex).filter(t => t[0] === "p").map(t => t[1])
             }
        }
    }
    return { at: 0, keys: [] }
}

export function getMuted(feed: NoteStore, pubkey: HexKey): HexKey[] {
    let lists = feed?.notes.filter(a => a.kind === EventKind.Lists && a.pubkey === pubkey);
    return getMutedKeys(lists).keys;
}
