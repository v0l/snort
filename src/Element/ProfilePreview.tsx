import "./ProfilePreview.css";
import { ReactNode } from "react";

import ProfileImage from "Element/ProfileImage";
import FollowButton from "Element/FollowButton";
import { useUserProfile } from "Feed/ProfileFeed";
import { HexKey } from "Nostr";
import { useInView } from "react-intersection-observer";

export interface ProfilePreviewProps {
    pubkey: HexKey,
    options?: {
        about?: boolean
    },
    actions?: ReactNode,
    className?: string
}
export default function ProfilePreview(props: ProfilePreviewProps) {
    const pubkey = props.pubkey;
    const user = useUserProfile(pubkey);
    const { ref, inView } = useInView({ triggerOnce: true });
    const options = {
        about: true,
        ...props.options
    };

    return (
        <div className={`profile-preview${props.className ? ` ${props.className}` : ""}`} ref={ref}>
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
