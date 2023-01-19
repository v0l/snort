import "./ProfilePreview.css";
import { ReactNode } from "react";

import ProfileImage from "./ProfileImage";
import FollowButton from "./FollowButton";
import useProfile from "../feed/ProfileFeed";
import { HexKey } from "../nostr";
import { useInView } from "react-intersection-observer";

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
    const { ref, inView } = useInView({ triggerOnce: true });
    const options = {
        about: true,
        ...props.options
    };

    return (
        <div className="profile-preview" ref={ref}>
            {inView && <>
                <ProfileImage pubkey={pubkey} subHeader=
                    {options.about ? <div className="f-ellipsis about">
                        {user?.about}
                    </div> : undefined} />
                {props.actions ?? <FollowButton pubkey={pubkey} className="ml5" />}
            </>}
        </div>
    )
}