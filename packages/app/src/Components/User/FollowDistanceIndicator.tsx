import classNames from "classnames";

import Icon from "@/Components/Icons/Icon";
import useWoT from "@/Hooks/useWoT";

interface FollowDistanceIndicatorProps {
  pubkey: string;
  className?: string;
}

export default function FollowDistanceIndicator({ pubkey, className }: FollowDistanceIndicatorProps) {
  const wot = useWoT();
  const followDistance = wot.followDistance(pubkey);
  let followDistanceColor = "";
  let title = "";

  if (followDistance === 0) {
    title = "You";
    followDistanceColor = "text-success";
  } else if (followDistance <= 1) {
    followDistanceColor = "text-success";
    title = "Following";
  } else if (followDistance === 2) {
    const followedByFriendsCount = wot.followedByCount(pubkey);
    if (followedByFriendsCount > 10) {
      followDistanceColor = "text-zap";
    }
    title = `Followed by ${followedByFriendsCount} friends`;
  } else if (followDistance > 2) {
    return null;
  }

  return (
    <div
      className={classNames("w-4 h-4 bg-layer-1 rounded-full flex items-center justify-center", className)}
      title={title}>
      <Icon name="check" className={followDistanceColor} size={10} />
    </div>
  );
}
