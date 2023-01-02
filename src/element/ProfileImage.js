import "./ProfileImage.css";
import { useNavigate } from "react-router-dom";
import useProfile from "../feed/ProfileFeed";
import Nostrich from "../nostrich.jpg";

export default function ProfileImage(props) {
    const pubkey = props.pubkey;
    const subHeader = props.subHeader;
    const navigate = useNavigate();
    const user = useProfile(pubkey);

    const hasImage = (user?.picture?.length ?? 0) > 0;
    return (
        <div className="pfp">
            <img src={hasImage ? user.picture : Nostrich} onClick={() => navigate(`/p/${pubkey}`)} />
            <div>
                {user?.name ?? pubkey.substring(0, 8)}
                {subHeader ? <div>{subHeader}</div> : null}
            </div>
        </div>
    )
}