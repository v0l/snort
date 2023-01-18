import { useMemo } from "react";
import useFollowsFeed from "../feed/FollowsFeed";
import { HexKey } from "../nostr";
import FollowListBase from "./FollowListBase";
import { getFollowers} from "../feed/FollowsFeed";

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