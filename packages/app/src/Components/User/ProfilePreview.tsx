import "./ProfilePreview.css";

import { HexKey, UserMetadata } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import { ReactNode } from "react";
import { useInView } from "react-intersection-observer";

import FollowButton from "@/Components/User/FollowButton";
import ProfileImage from "@/Components/User/ProfileImage";

export interface ProfilePreviewProps {
  pubkey: HexKey;
  options?: {
    about?: boolean;
    linkToProfile?: boolean;
    profileCards?: boolean;
  };
  profile?: UserMetadata;
  actions?: ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}
export default function ProfilePreview(props: ProfilePreviewProps) {
  const pubkey = props.pubkey;
  const { ref, inView } = useInView({ triggerOnce: true });
  const user = useUserProfile(inView ? pubkey : undefined);
  const options = {
    about: true,
    ...props.options,
  };

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (props.onClick) {
      e.stopPropagation();
      e.preventDefault();
      props.onClick(e);
    }
  }

  return (
    <>
      <div
        className={`justify-between profile-preview${props.className ? ` ${props.className}` : ""}`}
        ref={ref}
        onClick={handleClick}>
        {inView && (
          <>
            <ProfileImage
              pubkey={pubkey}
              profile={props.profile}
              link={options.linkToProfile ?? true ? undefined : ""}
              subHeader={options.about ? <div className="about">{user?.about}</div> : undefined}
              showProfileCard={options.profileCards}
            />
            {props.actions ?? (
              <div className="whitespace-nowrap">
                <FollowButton pubkey={pubkey} />
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
