import { useMemo } from "react";
import EventKind from "../nostr/EventKind";
import { Subscriptions } from "../nostr/Subscriptions";
import useSubscription from "./Subscription";

export default function useFollowersFeed(pubkey) {
    const sub = useMemo(() => {
        let x = new Subscriptions();
        x.Id = "followers";
        x.Kinds.add(EventKind.ContactList);
        x.PTags.add(pubkey);

        return x;
    }, [pubkey]);

    return useSubscription(sub);
}