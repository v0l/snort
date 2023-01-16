import { useMemo } from "react";
import { HexKey } from "../nostr";
import EventKind from "../nostr/EventKind";
import { Subscriptions } from "../nostr/Subscriptions";
import useSubscription from "./Subscription";

export default function useFollowersFeed(pubkey: HexKey) {
    const sub = useMemo(() => {
        let x = new Subscriptions();
        x.Id = "followers";
        x.Kinds = new Set([EventKind.ContactList]);
        x.PTags = new Set([pubkey]);

        return x;
    }, [pubkey]);

    return useSubscription(sub);
}