import "./ProfileImage.css";
import { useNavigate } from "react-router-dom";
import useProfile from "../pages/feed/ProfileFeed";
import Nostrich from "../nostrich.jpg";

export default function ProfileImage(props) {
    const pubKey = props.pubKey;
    const subHeader = props.subHeader;
    const navigate = useNavigate();
    const user = useProfile(pubKey);

    return (
        <div className="pfp">
            <img src={user?.picture ?? Nostrich} onClick={() => navigate(`/p/${pubKey}`)} />
            <div>
                {user?.name ?? pubKey.substring(0, 8)}
                {subHeader}
            </div>
        </div>
    )
}