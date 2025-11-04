import { UserMetadata } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import classNames from "classnames";
import React, { ReactNode } from "react";

import { LeaderBadge } from "@/Components/CommunityLeaders/LeaderBadge";
import Avatar from "@/Components/User/Avatar";
import FollowDistanceIndicator from "@/Components/User/FollowDistanceIndicator";
import { useCommunityLeader } from "@/Hooks/useCommunityLeaders";

import DisplayName from "./DisplayName";
import { ProfileCardWrapper } from "./ProfileCardWrapper";
import { ProfileLink } from "./ProfileLink";
import Nip05 from "./Nip05";

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
  showNip05?: boolean;
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
  showNip05 = true,
}: ProfileImageProps) {
  const user = useUserProfile(profile ? "" : pubkey) ?? profile;
  const leader = useCommunityLeader(pubkey);

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
          icons={
            showFollowDistance || icons ? (
              <>
                {icons}
                {showFollowDistance && <FollowDistanceIndicator pubkey={pubkey} />}
              </>
            ) : undefined
          }></Avatar>
        {showUsername && (
          <div className={displayNameClassName}>
            <div className="flex gap-2 items-center font-medium">
              {overrideUsername ? overrideUsername : <DisplayName pubkey={pubkey} user={user} />}
              {leader && showBadges && CONFIG.features.communityLeaders && <LeaderBadge />}
              {user?.nip05 && CONFIG.showNip05 && showNip05 && (
                <Nip05 nip05={user?.nip05} pubkey={pubkey} showBadges={true} className="text-xs" />
              )}
            </div>
            {subHeader}
          </div>
        )}
      </>
    );
  }

  const classNamesOverInner = classNames(
    "min-w-0 z-2",
    {
      "flex gap-2 items-center": showUsername,
    },
    className,
  );

  const content =
    link === "" ? (
      <div className={classNamesOverInner} onClick={handleClick}>
        {inner()}
      </div>
    ) : (
      <ProfileLink
        pubkey={pubkey}
        user={user}
        explicitLink={link}
        className={classNamesOverInner}
        onClick={handleClick}>
        {inner()}
      </ProfileLink>
    );

  if (!showProfileCard) {
    return content;
  }

  return (
    <ProfileCardWrapper pubkey={pubkey} user={user}>
      {content}
    </ProfileCardWrapper>
  );
}
