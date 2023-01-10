import { useSelector } from "react-redux";
import useEventPublisher from "../feed/EventPublisher";

export default function FollowButton(props) {
    const pubkey = props.pubkey;
    const publiser = useEventPublisher();
    const follows = useSelector(s => s.login.follows);
    let isFollowing = follows?.includes(pubkey) ?? false;
    const baseClassName =  isFollowing ? `btn btn-warn` : `btn btn-success`
    const className = props.className ? `${baseClassName} ${props.className}` : `${baseClassName}`;
    
    async function follow(pubkey) {
        let ev = await publiser.addFollow(pubkey);
        publiser.broadcast(ev);
    }

    async function unfollow(pubkey) {
        let ev = await publiser.removeFollow(pubkey);
        publiser.broadcast(ev);
    }

    return (
        <div className={className} onClick={() => isFollowing ? unfollow(pubkey) : follow(pubkey)}>
            {isFollowing ? "Unfollow" : "Follow"}
        </div>
    )
}