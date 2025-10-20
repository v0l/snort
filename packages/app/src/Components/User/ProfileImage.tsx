import { UserMetadata } from "@snort/system";
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
  pubkey: string;
  subHeader?: ReactNode;
  showUsername?: boolean;
  className?: string;
  link?: string;
  defaultNip?: string;
  verifyNip?: boolean;
  overrideUsername?: ReactNode;
  profile?: UserMetadata;
  size?: number;
  onClick?: (e: React.MouseEvent) => void;
  imageOverlay?: ReactNode;
  showFollowDistance?: boolean;
  icons?: ReactNode;
  showProfileCard?: boolean;
  showBadges?: boolean;
  displayNameClassName?: string;
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
  displayNameClassName,
}: ProfileImageProps) {
  const user = useUserProfile(profile ? "" : pubkey) ?? profile;
  const [isHovering, setIsHovering] = useState(false);
  const leader = useCommunityLeader(pubkey);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = useCallback(() => {
    hoverTimeoutRef.current && clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setIsHovering(true), 100);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoverTimeoutRef.current && clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setIsHovering(false), 300);
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
        <Avatar
          pubkey={pubkey}
          user={user}
          size={size}
          imageOverlay={imageOverlay}
          showTitle={!showProfileCard}
          onMouseEnter={handleMouseEnter}
          icons={
            showFollowDistance || icons ? (
              <>
                {icons}
                {showFollowDistance && <FollowDistanceIndicator pubkey={pubkey} />}
              </>
            ) : undefined
          }
        />
        {showUsername && (
          <div className={displayNameClassName}>
            <div className="flex gap-2 items-center font-medium">
              {overrideUsername ? overrideUsername : <DisplayName pubkey={pubkey} user={user} />}
              {leader && showBadges && CONFIG.features.communityLeaders && <LeaderBadge />}
            </div>
            {subHeader}
          </div>
        )}
      </>
    );
  }

  function profileCard() {
    if (showProfileCard && user && isHovering) {
      return (
        <div className="absolute shadow-lg">
          <ProfileCard pubkey={pubkey} user={user} show={true} delay={100} />
        </div>
      );
    }
    return null;
  }

  const classNamesOverInner = classNames(
    "min-w-0",
    {
      "grid grid-cols-[min-content_auto] gap-2 items-center": showUsername,
    },
    className,
  );
  if (link === "") {
    return (
      <>
        <div className={classNamesOverInner} onClick={handleClick}>
          {inner()}
        </div>
        {profileCard()}
      </>
    );
  } else {
    return (
      <div onMouseLeave={handleMouseLeave}>
        <ProfileLink
          pubkey={pubkey}
          user={user}
          explicitLink={link}
          className={classNamesOverInner}
          onClick={handleClick}>
          {inner()}
        </ProfileLink>
        {profileCard()}
      </div>
    );
  }
}
