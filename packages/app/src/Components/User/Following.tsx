import { FormattedMessage } from "react-intl";

import Icon from "@/Components/Icons/Icon";
import useFollowsControls from "@/Hooks/useFollowControls";

export function FollowingMark({ pubkey }: { pubkey: string }) {
  const { isFollowing } = useFollowsControls();
  const doesFollow = isFollowing(pubkey);
  if (!doesFollow) return;

  return (
    <span className="flex gap-1 px-1 py-0.5 text-sm layer-1">
      <Icon name="check" className="text-success" size={12} />
      <FormattedMessage defaultMessage="following" />
    </span>
  );
}
