import "./ProfileImage.css";
import Nostrich from "../nostrich.jpg";

import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import useProfile from "../feed/ProfileFeed";
import { hexToBech32, profileLink } from "../Util";
import LazyImage from "./LazyImage";
import Nip05 from "./Nip05";

export default function ProfileImage({ pubkey, subHeader, showUsername = true, className, link }) {
    const navigate = useNavigate();
    const user = useProfile(pubkey);

    const hasImage = (user?.picture?.length ?? 0) > 0;
    const name = useMemo(() => {
        let name = hexToBech32("npub", pubkey).substring(0, 12);
        if (user?.display_name?.length > 0) {
            name = user.display_name;
        } else if (user?.name?.length > 0) {
            name = user.name;
        }
        return name;
    }, [user]);

    return (
        <div className={`pfp ${className}`}>
            <LazyImage src={hasImage ? user.picture : Nostrich} onClick={() => navigate(link ?? profileLink(pubkey))} />
            {showUsername && (<div className="f-grow">
                <div className="profile-name">
                  <Link key={pubkey} to={link ?? profileLink(pubkey)}>
                    {user?.nip05 ? (
                        <Nip05
                          nip05={user.nip05}
                          pubkey={user.pubkey}
                          defaultUsername={user.display_name || user.name}
                        />
                      ): name}
                  </Link>
                </div>
                {subHeader ? <>{subHeader}</> : null}
            </div>
            )}
        </div>
    )
}
