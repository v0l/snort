import { useMemo } from "react";
import useFollowsFeed from "../feed/FollowsFeed";
import EventKind from "../nostr/EventKind";
import FollowListBase from "./FollowListBase";

export default function FollowsList({ pubkey }) {
    const feed = useFollowsFeed(pubkey);

    const pubkeys = useMemo(() => {
        let contactLists = feed?.notes.filter(a => a.kind === EventKind.ContactList && a.pubkey === pubkey);
        let pTags = contactLists?.map(a => a.tags.filter(b => b[0] === "p").map(c => c[1]));
        return [...new Set(pTags?.flat())];
    }, [feed]);

    return <FollowListBase pubkeys={pubkeys} />
}