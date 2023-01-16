import { useMemo } from "react";
import { HexKey } from "../nostr";
import EventKind from "../nostr/EventKind";
import { Subscriptions } from "../nostr/Subscriptions";
import useSubscription from "./Subscription";

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