import "./ProfilePreview.css";
import { ReactNode } from "react";
import { HexKey } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import { useInView } from "react-intersection-observer";

import ProfileImage from "Element/ProfileImage";
import FollowButton from "Element/FollowButton";

export interface ProfilePreviewProps {
  pubkey: HexKey;
  options?: {
    about?: boolean;
    linkToProfile?: boolean;
  };
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
      <div className={`profile-preview${props.className ? ` ${props.className}` : ""}`} ref={ref} onClick={handleClick}>
        {inView && (
          <>
            <ProfileImage
              pubkey={pubkey}
              link={options.linkToProfile ?? true ? undefined : ""}
              subHeader={options.about ? <div className="about">{user?.about}</div> : undefined}
            />
            {props.actions ?? (
              <div className="follow-button-container">
                <FollowButton pubkey={pubkey} />
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
