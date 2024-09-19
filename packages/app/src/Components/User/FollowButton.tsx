import { HexKey } from "@snort/system";
import classNames from "classnames";
import { FormattedMessage } from "react-intl";

import AsyncButton from "@/Components/Button/AsyncButton";
import useFollowsControls from "@/Hooks/useFollowControls";
import useLogin from "@/Hooks/useLogin";
import { parseId } from "@/Utils";

import messages from "../messages";

export interface FollowButtonProps {
  pubkey: HexKey;
  className?: string;
}
export default function FollowButton(props: FollowButtonProps) {
  const pubkey = parseId(props.pubkey);
  const readonly = useLogin(s => s.readonly);
  const control = useFollowsControls();
  const isFollowing = control.isFollowing(pubkey);

  return (
    <AsyncButton
      className={classNames(props.className, "secondary")}
      disabled={readonly}
      onClick={async e => {
        e.stopPropagation();
        await (isFollowing ? control.removeFollow([pubkey]) : control.addFollow([pubkey]));
      }}>
      {isFollowing ? <FormattedMessage {...messages.Unfollow} /> : <FormattedMessage {...messages.Follow} />}
    </AsyncButton>
  );
}
