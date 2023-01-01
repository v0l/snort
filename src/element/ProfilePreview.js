import "./ProfilePreview.css";
import ProfileImage from "./ProfileImage";
import { useSelector } from "react-redux";
import FollowButton from "./FollowButton";

export default function ProfilePreview(props) {
    const pubkey = props.pubkey;
    const user = useSelector(s => s.users.users[pubkey]);

    return (
        <div className="profile-preview">
            <ProfileImage pubkey={pubkey}/>
            <div className="f-ellipsis">
                {user?.about}
            </div>
            <FollowButton pubkey={pubkey} className="ml5"/>
        </div>
    )
}