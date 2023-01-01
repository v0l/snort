import { useSelector } from "react-redux";
import useEventPublisher from "../feed/EventPublisher";

export default function FollowButton(props) {
    const pubkey = props.pubkey;
    const className = props.className ? `btn ${props.className}` : "btn";
    const publiser = useEventPublisher();
    const follows = useSelector(s => s.login.follows);
    
    async function follow(pubkey) {
        let ev = await publiser.addFollow(pubkey);
        publiser.broadcast(ev);
    }

    let isFollowing = follows?.includes(pubkey) ?? false;
    return (
        <div className={className} onClick={() => follow(pubkey)}>
            {isFollowing ? "Unfollow" : "Follow"}
        </div>
    )
}