import "./ProfileImage.css";

import React, { ReactNode, useCallback, useRef, useState } from "react";
import { HexKey, socialGraphInstance, UserMetadata } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import classNames from "classnames";

import Avatar from "@/Element/User/Avatar";
import Nip05 from "@/Element/User/Nip05";
import Icon from "@/Icons/Icon";
import DisplayName from "./DisplayName";
import { ProfileLink } from "./ProfileLink";
import { ProfileCard } from "./ProfileCard";

export interface ProfileImageProps {
  pubkey: HexKey;
  subHeader?: JSX.Element;
  showUsername?: boolean;
  className?: string;
  link?: string;
  defaultNip?: string;
  verifyNip?: boolean;
  overrideUsername?: string;
  profile?: UserMetadata;
  size?: number;
  onClick?: (e: React.MouseEvent) => void;
  imageOverlay?: ReactNode;
  showFollowDistance?: boolean;
  icons?: ReactNode;
  showProfileCard?: boolean;
}

export default function ProfileImage({
  pubkey,
  subHeader,
  showUsername = true,
  className,
  link,
  defaultNip,
  verifyNip,
  overrideUsername,
  profile,
  size,
  imageOverlay,
  onClick,
  showFollowDistance = true,
  icons,
  showProfileCard,
}: ProfileImageProps) {
  const user = useUserProfile(profile ? "" : pubkey) ?? profile;
  const nip05 = defaultNip ? defaultNip : user?.nip05;
  const followDistance = socialGraphInstance.getFollowDistance(pubkey);
  const [isHovering, setIsHovering] = useState(false);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = useCallback(() => {
    hoverTimeoutRef.current && clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setIsHovering(true), 100); // Adjust timeout as needed
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoverTimeoutRef.current && clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setIsHovering(false), 300); // Adjust timeout as needed
  }, []);

  function handleClick(e: React.MouseEvent) {
    if (link === "") {
      e.preventDefault();
      onClick?.(e);
    }
  }

  function inner() {
    let followDistanceColor = "";
    if (followDistance <= 1) {
      followDistanceColor = "success";
    } else if (followDistance === 2 && socialGraphInstance.followedByFriendsCount(pubkey) >= 10) {
      followDistanceColor = "text-nostr-orange";
    }
    return (
      <>
        <div className="avatar-wrapper" onMouseEnter={handleMouseEnter}>
          <Avatar
            pubkey={pubkey}
            user={user}
            size={size}
            imageOverlay={imageOverlay}
            icons={
              (followDistance <= 2 && showFollowDistance) || icons ? (
                <>
                  {icons}
                  {showFollowDistance && (
                    <div className="icon-circle">
                      <Icon name="check" className={followDistanceColor} size={10} />
                    </div>
                  )}
                </>
              ) : undefined
            }
          />
        </div>
        {showUsername && (
          <div className="f-ellipsis">
            <div className="flex g4 username">
              {overrideUsername ? overrideUsername : <DisplayName pubkey={pubkey} user={user} />}
              {nip05 && <Nip05 nip05={nip05} pubkey={pubkey} verifyNip={verifyNip} />}
            </div>
            <div className="subheader">{subHeader}</div>
          </div>
        )}
      </>
    );
  }

  function profileCard() {
    if ((showProfileCard ?? true) && user && isHovering) {
      return (
        <div className="absolute shadow-lg z-10">
          <ProfileCard pubkey={pubkey} user={user} show={true} />
        </div>
      );
    }
    return null;
  }

  if (link === "") {
    return (
      <>
        <div className={classNames("pfp", className)} onClick={handleClick}>
          {inner()}
        </div>
        {profileCard()}
      </>
    );
  } else {
    return (
      <div className="relative" onMouseLeave={handleMouseLeave}>
        <ProfileLink
          pubkey={pubkey}
          className={classNames("pfp", className)}
          user={user}
          explicitLink={link}
          onClick={handleClick}>
          {inner()}
        </ProfileLink>
        {profileCard()}
      </div>
    );
  }
}
