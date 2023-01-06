import "./ProfileImage.css";
import Nostrich from "../nostrich.jpg";

import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import useProfile from "../feed/ProfileFeed";
import { profileLink } from "../Util";

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
            <img src={hasImage ? user.picture : Nostrich} onClick={() => navigate(profileLink(pubkey))} />
            <div>
                <Link key={pubkey} to={profileLink(pubkey)}>{name}</Link>
                {subHeader ? <div>{subHeader}</div> : null}
            </div>
        </div>
    )
}