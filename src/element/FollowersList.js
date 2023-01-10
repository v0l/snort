import { useMemo } from "react";
import useFollowersFeed from "../feed/FollowersFeed";
import EventKind from "../nostr/EventKind";
import FollowListBase from "./FollowListBase";

export default function FollowersList({ pubkey }) {
    const feed = useFollowersFeed(pubkey);

    const pubkeys = useMemo(() => {
        let contactLists = feed?.notes.filter(a => a.kind === EventKind.ContactList && a.tags.some(b => b[0] === "p" && b[1] === pubkey));
        return [...new Set(contactLists?.map(a => a.pubkey))];
    }, [feed]);

    return <FollowListBase pubkeys={pubkeys} />
}