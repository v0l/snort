import { useSelector } from "react-redux";
import useEventPublisher from "Feed/EventPublisher";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserMinus, faUserPlus } from "@fortawesome/free-solid-svg-icons";
import { HexKey } from "Nostr";
import { RootState } from "State/Store";

export interface FollowButtonProps {
    pubkey: HexKey,
    className?: string,
}
export default function FollowButton(props: FollowButtonProps) {
    const pubkey = props.pubkey;
    const publiser = useEventPublisher();
    const isFollowing = useSelector<RootState, boolean>(s => s.login.follows?.includes(pubkey) ?? false);
    const baseClassName = isFollowing ? `btn btn-warn follow-button` : `btn btn-success follow-button`
    const className = props.className ? `${baseClassName} ${props.className}` : `${baseClassName}`;

    async function follow(pubkey: HexKey) {
        let ev = await publiser.addFollow(pubkey);
        publiser.broadcast(ev);
    }

    async function unfollow(pubkey: HexKey) {
        let ev = await publiser.removeFollow(pubkey);
        publiser.broadcast(ev);
    }

    return (
        <div className={className} onClick={() => isFollowing ? unfollow(pubkey) : follow(pubkey)}>
            <FontAwesomeIcon icon={isFollowing ? faUserMinus : faUserPlus} size="lg" />
        </div>
    )
}