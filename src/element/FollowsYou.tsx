import "./FollowsYou.css";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { HexKey } from "../nostr";
import { RootState } from "../state/Store";
import  useFollowsFeed from "../feed/FollowsFeed";
import { getFollowers } from "../feed/FollowsFeed";

export interface FollowsYouProps {
    pubkey: HexKey
}

export default function FollowsYou({ pubkey }: FollowsYouProps ) {
    const feed = useFollowsFeed(pubkey);
    const loginPubKey = useSelector<RootState, HexKey | undefined>(s => s.login.publicKey);

    const pubkeys = useMemo(() => {
        return getFollowers(feed, pubkey);
    }, [feed]);

    const followsMe = pubkeys.includes(loginPubKey!) ?? false ;

    return (
        <>
            { followsMe ? <span className="follows-you">follows you</span> : null }
        </>
    )
}
