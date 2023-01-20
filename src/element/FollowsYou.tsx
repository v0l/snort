import "./FollowsYou.css";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { HexKey } from "Nostr";
import { RootState } from "State/Store";
import  useFollowsFeed from "Feed/FollowsFeed";
import { getFollowers } from "Feed/FollowsFeed";

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
