import "./Following.css";

import { FormattedMessage } from "react-intl";

import Icon from "@/Components/Icons/Icon";
import useFollowsControls from "@/Hooks/useFollowControls";

export function FollowingMark({ pubkey }: { pubkey: string }) {
  const { isFollowing } = useFollowsControls();
  const doesFollow = isFollowing(pubkey);
  if (!doesFollow) return;

  return (
    <span className="following flex g4">
      <Icon name="check" className="success" size={12} />
      <FormattedMessage defaultMessage="following" id="+tShPg" />
    </span>
  );
}
