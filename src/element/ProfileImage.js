import "./ProfileImage.css";
import { useNavigate } from "react-router-dom";
import useProfile from "../pages/feed/ProfileFeed";

export default function ProfileImage(props) {
    const pubKey = props.pubKey;
    const subHeader = props.subHeader;
    const navigate = useNavigate();
    const user = useProfile(pubKey);

    return (
        <div className="pfp">
            <img src={user?.picture} onClick={() => navigate(`/p/${pubKey}`)} />
            <div>
                {user?.name ?? pubKey.substring(0, 8)}
                {subHeader}
            </div>
        </div>
    )
}