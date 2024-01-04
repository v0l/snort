import "./Following.css";
import { FormattedMessage } from "react-intl";

import useLogin from "@/Hooks/useLogin";
import Icon from "@/Components/Icons/Icon";

export function FollowingMark({ pubkey }: { pubkey: string }) {
  const { follows } = useLogin(s => ({ follows: s.follows }));
  const doesFollow = follows.item.includes(pubkey);
  if (!doesFollow) return;

  return (
    <span className="following flex g4">
      <Icon name="check" className="success" size={12} />
      <FormattedMessage defaultMessage="following" id="+tShPg" />
    </span>
  );
}
