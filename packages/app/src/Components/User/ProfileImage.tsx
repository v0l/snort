import "./ProfileImage.css";

import { HexKey, UserMetadata } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import classNames from "classnames";
import React, { ReactNode, useCallback, useRef, useState } from "react";

import { LeaderBadge } from "@/Components/CommunityLeaders/LeaderBadge";
import Avatar from "@/Components/User/Avatar";
import FollowDistanceIndicator from "@/Components/User/FollowDistanceIndicator";
import { useCommunityLeader } from "@/Hooks/useCommunityLeaders";

import DisplayName from "./DisplayName";
import { ProfileCard } from "./ProfileCard";
import { ProfileLink } from "./ProfileLink";

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
  showBadges?: boolean;
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
  showProfileCard = false,
  showBadges = false,
}: ProfileImageProps) {
  const user = useUserProfile(profile ? "" : pubkey) ?? profile;
  const [isHovering, setIsHovering] = useState(false);
  const leader = useCommunityLeader(pubkey);

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
            <div className="flex gap-2 items-center font-medium">
              {overrideUsername ? overrideUsername : <DisplayName pubkey={pubkey} user={user} />}
              {leader && showBadges && CONFIG.features.communityLeaders && <LeaderBadge />}
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
        <div className="absolute shadow-lg z-10 fade-in">
          <ProfileCard pubkey={pubkey} user={user} show={true} delay={100} />
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
