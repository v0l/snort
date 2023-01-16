import "./ProfileImage.css";
// @ts-ignore
import Nostrich from "../nostrich.jpg";

import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import useProfile from "../feed/ProfileFeed";
import { hexToBech32, profileLink } from "../Util";
import LazyImage from "./LazyImage";
import Nip05 from "./Nip05";
import { HexKey } from "../nostr";

export interface ProfileImageProps {
    pubkey: HexKey,
    subHeader?: JSX.Element,
    showUsername?: boolean,
    className?: string,
    link?: string
};

export default function ProfileImage({ pubkey, subHeader, showUsername = true, className, link }: ProfileImageProps) {
    const navigate = useNavigate();
    const user = useProfile(pubkey)?.get(pubkey);
    
    const hasImage = (user?.picture?.length ?? 0) > 0;
    const name = useMemo(() => {
        let name = hexToBech32("npub", pubkey).substring(0, 12);
        if ((user?.display_name?.length ?? 0) > 0) {
            name = user!.display_name!;
        } else if ((user?.name?.length ?? 0) > 0) {
            name = user!.name!;
        }
        return name;
    }, [user]);

    return (
        <div className={`pfp${className ? ` ${className}` : ""}`}>
            <LazyImage src={hasImage ? user!.picture : Nostrich} onClick={() => navigate(link ?? profileLink(pubkey))} />
            {showUsername && (<div className="f-grow">
                <Link key={pubkey} to={link ?? profileLink(pubkey)}>
                    <div className="profile-name">
                        <div>{name}</div>
                        {user?.nip05 && <Nip05 nip05={user.nip05} pubkey={user.pubkey} />}
                    </div>
                </Link>
                {subHeader ? <>{subHeader}</> : null}
            </div>
            )}
        </div>
    )
}
