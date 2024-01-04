import { HexKey, socialGraphInstance } from "@snort/system";
import classNames from "classnames";
import React from "react";

import Icon from "@/Components/Icons/Icon";

interface FollowDistanceIndicatorProps {
  pubkey: HexKey;
  className?: string;
}

export default function FollowDistanceIndicator({ pubkey, className }: FollowDistanceIndicatorProps) {
  const followDistance = socialGraphInstance.getFollowDistance(pubkey);
  let followDistanceColor = "";
  let title = "";

  if (followDistance === 0) {
    title = "You";
    followDistanceColor = "success";
  } else if (followDistance <= 1) {
    followDistanceColor = "success";
    title = "Following";
  } else if (followDistance === 2) {
    const followedByFriendsCount = socialGraphInstance.followedByFriendsCount(pubkey);
    if (followedByFriendsCount > 10) {
      followDistanceColor = "text-nostr-orange";
    }
    title = `Followed by ${followedByFriendsCount} friends`;
  } else if (followDistance > 2) {
    return null;
  }

  return (
    <span className={classNames("icon-circle", className)} title={title}>
      <Icon name="check" className={followDistanceColor} size={10} />
    </span>
  );
}
