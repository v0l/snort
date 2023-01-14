import { useSelector } from "react-redux";
import useEventPublisher from "../feed/EventPublisher";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserMinus, faUserPlus } from "@fortawesome/free-solid-svg-icons";

export default function FollowButton(props) {
    const pubkey = props.pubkey;
    const publiser = useEventPublisher();
    const follows = useSelector(s => s.login.follows);
    let isFollowing = follows?.includes(pubkey) ?? false;
    const baseClassName =  isFollowing ? `btn btn-warn follow-button` : `btn btn-success follow-button`
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
          <FontAwesomeIcon icon={isFollowing ? faUserMinus : faUserPlus} size="lg" />
        </div>
    )
}