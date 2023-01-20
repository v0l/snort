import { useMemo } from "react";
import useFollowersFeed from "Feed/FollowersFeed";
import { HexKey } from "Nostr";
import EventKind from "Nostr/EventKind";
import FollowListBase from "Element/FollowListBase";

export interface FollowersListProps {
    pubkey: HexKey
}

export default function FollowersList({ pubkey }: FollowersListProps) {
    const feed = useFollowersFeed(pubkey);

    const pubkeys = useMemo(() => {
        let contactLists = feed?.notes.filter(a => a.kind === EventKind.ContactList && a.tags.some(b => b[0] === "p" && b[1] === pubkey));
        return [...new Set(contactLists?.map(a => a.pubkey))];
    }, [feed]);

    return <FollowListBase pubkeys={pubkeys} title={`${pubkeys?.length} followers`} />
}