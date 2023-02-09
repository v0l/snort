import "./FollowButton.css";
import { useSelector } from "react-redux";
import { FormattedMessage } from "react-intl";
import useEventPublisher from "Feed/EventPublisher";
import { HexKey } from "Nostr";
import { RootState } from "State/Store";
import { parseId } from "Util";

import messages from "./messages";

export interface FollowButtonProps {
  pubkey: HexKey;
  className?: string;
}
export default function FollowButton(props: FollowButtonProps) {
  const pubkey = parseId(props.pubkey);
  const publiser = useEventPublisher();
  const isFollowing = useSelector<RootState, boolean>(s => s.login.follows?.includes(pubkey) ?? false);
  const baseClassname = `${props.className} follow-button`;

  async function follow(pubkey: HexKey) {
    const ev = await publiser.addFollow(pubkey);
    publiser.broadcast(ev);
  }

  async function unfollow(pubkey: HexKey) {
    const ev = await publiser.removeFollow(pubkey);
    publiser.broadcast(ev);
  }

  return (
    <button
      type="button"
      className={isFollowing ? `${baseClassname} secondary` : baseClassname}
      onClick={() => (isFollowing ? unfollow(pubkey) : follow(pubkey))}>
      {isFollowing ? <FormattedMessage {...messages.Unfollow} /> : <FormattedMessage {...messages.Follow} />}
    </button>
  );
}
