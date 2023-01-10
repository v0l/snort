import { useMemo } from "react";
import EventKind from "../nostr/EventKind";
import { Subscriptions } from "../nostr/Subscriptions";
import useSubscription from "./Subscription";

export default function useFollowsFeed(pubkey) {
    const sub = useMemo(() => {
        let x = new Subscriptions();
        x.Id = "follows";
        x.Kinds.add(EventKind.ContactList);
        x.Authors.add(pubkey);

        return x;
    }, [pubkey]);

    return useSubscription(sub);
}