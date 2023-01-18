import { useMemo } from "react";
import { HexKey } from "../nostr";
import EventKind from "../nostr/EventKind";
import { Subscriptions} from "../nostr/Subscriptions";
import useSubscription from "./Subscription";
import { NoteStore } from "./Subscription"

export default function useFollowsFeed(pubkey: HexKey) {
    const sub = useMemo(() => {
        let x = new Subscriptions();
        x.Id = "follows";
        x.Kinds = new Set([EventKind.ContactList]);
        x.Authors = new Set([pubkey]);

        return x;
    }, [pubkey]);

    return useSubscription(sub);
}

export function getFollowers(feed: NoteStore, pubkey: HexKey) {
    let contactLists = feed?.notes.filter(a => a.kind === EventKind.ContactList && a.pubkey === pubkey);
    let pTags = contactLists?.map(a => a.tags.filter(b => b[0] === "p").map(c => c[1]));
    return [...new Set(pTags?.flat())];
}
