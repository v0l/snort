import { useMemo } from "react";
import { HexKey } from "../nostr";
import EventKind from "../nostr/EventKind";
import { Subscriptions } from "../nostr/Subscriptions";
import useSubscription from "./Subscription";

export default function useZapsFeed(pubkey: HexKey) {
    const sub = useMemo(() => {
        let x = new Subscriptions();
        x.Id = `zaps:${pubkey}`;
        x.Kinds = new Set([EventKind.Zap]);
        x.PTags = new Set([pubkey]);
        return x;
    }, [pubkey]);

    return useSubscription(sub, { leaveOpen: true });
}
