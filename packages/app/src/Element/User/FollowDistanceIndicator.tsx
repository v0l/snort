import React from "react";
import { HexKey, socialGraphInstance } from "@snort/system";
import Icon from "@/Icons/Icon";
import classNames from "classnames";

interface FollowDistanceIndicatorProps {
  pubkey: HexKey;
  className?: string;
}

export default function FollowDistanceIndicator({ pubkey, className }: FollowDistanceIndicatorProps) {
  const followDistance = socialGraphInstance.getFollowDistance(pubkey);
  let followDistanceColor = "";

  if (followDistance <= 1) {
    followDistanceColor = "success";
  } else if (followDistance === 2 && socialGraphInstance.followedByFriendsCount(pubkey) >= 10) {
    followDistanceColor = "text-nostr-orange";
  } else if (followDistance > 2) {
    return null;
  }

  return (
    <span className={classNames("icon-circle", className)}>
      <Icon name="check" className={followDistanceColor} size={10} />
    </span>
  );
}
