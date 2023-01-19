import "./ProfilePreview.css";
import { ReactNode } from "react";

import ProfileImage from "./ProfileImage";
import FollowButton from "./FollowButton";
import useProfile from "../feed/ProfileFeed";
import { HexKey } from "../nostr";

export interface ProfilePreviewProps {
    pubkey: HexKey,
    options?: {
        about?: boolean
    },
    actions?: ReactNode
}
export default function ProfilePreview(props: ProfilePreviewProps) {
    const pubkey = props.pubkey;
    const user = useProfile(pubkey)?.get(pubkey);
    const options = {
        about: true,
        ...props.options
    };

    return (
        <div className="profile-preview">
            <ProfileImage pubkey={pubkey} subHeader=
                {options.about ? <div className="f-ellipsis about">
                    {user?.about}
                </div> : undefined} />
            {props.actions ?? <FollowButton pubkey={pubkey} className="ml5" />}
        </div>
    )
}