import { useMemo } from "react";
import useFollowsFeed from "Feed/FollowsFeed";
import { HexKey } from "Nostr";
import FollowListBase from "Element/FollowListBase";
import { getFollowers} from "Feed/FollowsFeed";

export interface FollowsListProps {
    pubkey: HexKey
}

export default function FollowsList({ pubkey }: FollowsListProps) {
    const feed = useFollowsFeed(pubkey);

    const pubkeys = useMemo(() => {
        return getFollowers(feed, pubkey);
    }, [feed]);

    return <FollowListBase pubkeys={pubkeys} title={`Following ${pubkeys?.length}`} />
}