import { useMemo } from "react";
import { HexKey } from "Nostr";
import EventKind from "Nostr/EventKind";
import { Subscriptions } from "Nostr/Subscriptions";
import useSubscription from "Feed/Subscription";

export default function useFollowersFeed(pubkey: HexKey) {
    const sub = useMemo(() => {
        let x = new Subscriptions();
        x.Id = `followers:${pubkey.slice(0, 12)}`;
        x.Kinds = new Set([EventKind.ContactList]);
        x.PTags = new Set([pubkey]);

        return x;
    }, [pubkey]);

    return useSubscription(sub);
}