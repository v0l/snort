import "./ProfilePreview.css";

import { HexKey, UserMetadata } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import { ReactNode } from "react";
import { useInView } from "react-intersection-observer";

import FollowButton from "@/Components/User/FollowButton";
import ProfileImage, { ProfileImageProps } from "@/Components/User/ProfileImage";

export interface ProfilePreviewProps {
  pubkey: HexKey;
  options?: {
    about?: boolean;
  };
  profile?: UserMetadata;
  actions?: ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  waitUntilInView?: boolean;
  profileImageProps?: Omit<ProfileImageProps, "pubkey" | "profile">;
}
export default function ProfilePreview(props: ProfilePreviewProps) {
  const pubkey = props.pubkey;
  const { ref, inView } = useInView({ triggerOnce: true, rootMargin: "500px" });
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
        {(!props.waitUntilInView || inView) && (
          <>
            <ProfileImage
              pubkey={pubkey}
              profile={props.profile}
              subHeader={options.about && <div className="about">{user?.about}</div>}
              {...props.profileImageProps}
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
