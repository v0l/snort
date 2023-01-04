import "./ProfileImage.css";
import { useNavigate } from "react-router-dom";
import useProfile from "../feed/ProfileFeed";
import Nostrich from "../nostrich.jpg";
import { useMemo } from "react";

export default function ProfileImage(props) {
    const pubkey = props.pubkey;
    const subHeader = props.subHeader;
    const navigate = useNavigate();
    const user = useProfile(pubkey);

    const hasImage = (user?.picture?.length ?? 0) > 0;
    const name = useMemo(() => {
        let name = pubkey.substring(0, 8);
        if (user?.display_name?.length > 0) {
            name = user.display_name;
        } else if (user?.name?.length > 0) {
            name = user.name;
        }
        return name;
    }, [user]);
    return (
        <div className="pfp">
            <img src={hasImage ? user.picture : Nostrich} onClick={() => navigate(`/p/${pubkey}`)} />
            <div>
                {name}
                {subHeader ? <div>{subHeader}</div> : null}
            </div>
        </div>
    )
}