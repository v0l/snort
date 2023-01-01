import "./ProfileImage.css";
import { useNavigate } from "react-router-dom";
import useProfile from "../feed/ProfileFeed";
import Nostrich from "../nostrich.jpg";

export default function ProfileImage(props) {
    const pubKey = props.pubkey;
    const subHeader = props.subHeader;
    const navigate = useNavigate();
    const user = useProfile(pubKey);

    const hasImage = (user?.picture?.length ?? 0) > 0;
    return (
        <div className="pfp">
            <img src={hasImage ? user.picture : Nostrich} onClick={() => navigate(`/p/${pubKey}`)} />
            <div>
                {user?.name ?? pubKey.substring(0, 8)}
                {subHeader}
            </div>
        </div>
    )
}