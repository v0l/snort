import "./ProfileImage.css";

import React, { ReactNode, useCallback, useRef, useState } from "react";
import { HexKey, UserMetadata } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import classNames from "classnames";

import Avatar from "@/Element/User/Avatar";
import DisplayName from "./DisplayName";
import { ProfileLink } from "./ProfileLink";
import { ProfileCard } from "./ProfileCard";
import FollowDistanceIndicator from "@/Element/User/FollowDistanceIndicator";

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
  overrideUsername,
  profile,
  size,
  imageOverlay,
  onClick,
  showFollowDistance = true,
  icons,
  showProfileCard = true,
}: ProfileImageProps) {
  const user = useUserProfile(profile ? "" : pubkey) ?? profile;
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
    return (
      <>
        <div className="avatar-wrapper" onMouseEnter={handleMouseEnter}>
          <Avatar
            pubkey={pubkey}
            user={user}
            size={size}
            imageOverlay={imageOverlay}
            showTitle={!showProfileCard}
            icons={
              showFollowDistance || icons ? (
                <>
                  {icons}
                  {showFollowDistance && <FollowDistanceIndicator pubkey={pubkey} />}
                </>
              ) : undefined
            }
          />
        </div>
        {showUsername && (
          <div className="f-ellipsis">
            <div className="flex g4 username">
              {overrideUsername ? overrideUsername : <DisplayName pubkey={pubkey} user={user} />}
            </div>
            <div className="subheader">{subHeader}</div>
          </div>
        )}
      </>
    );
  }

  function profileCard() {
    if (showProfileCard && user && isHovering) {
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
