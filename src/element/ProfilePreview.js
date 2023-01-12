import "./ProfilePreview.css";
import ProfileImage from "./ProfileImage";
import FollowButton from "./FollowButton";
import useProfile from "../feed/ProfileFeed";

export default function ProfilePreview(props) {
    const pubkey = props.pubkey;
    const user = useProfile(pubkey);
    const options = {
        about: true,
        ...props.options
    };

    return (
        <div className="profile-preview">
            <ProfileImage pubkey={pubkey} subHeader=
                {options.about ? <div className="f-ellipsis about">
                    {user?.about}
                </div> : null} />
            <FollowButton pubkey={pubkey} className="ml5" />
        </div>
    )
}