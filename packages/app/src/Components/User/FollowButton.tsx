import { HexKey } from "@snort/system";
import { FormattedMessage } from "react-intl";

import { FollowsFeed } from "@/Cache";
import AsyncButton from "@/Components/Button/AsyncButton";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import { parseId } from "@/Utils";

import messages from "../messages";

export interface FollowButtonProps {
  pubkey: HexKey;
  className?: string;
}
export default function FollowButton(props: FollowButtonProps) {
  const pubkey = parseId(props.pubkey);
  const { publisher, system } = useEventPublisher();
  const { follows, readonly } = useLogin(s => ({ follows: s.follows, readonly: s.readonly }));
  const isFollowing = follows.item.includes(pubkey);
  const baseClassname = props.className ? `${props.className} ` : "";

  async function follow(pubkey: HexKey) {
    if (publisher) {
      const ev = await publisher.contactList([pubkey, ...follows.item].map(a => ["p", a]));
      system.BroadcastEvent(ev);
      await FollowsFeed.backFill(system, [pubkey]);
    }
  }

  async function unfollow(pubkey: HexKey) {
    if (publisher) {
      const ev = await publisher.contactList(follows.item.filter(a => a !== pubkey).map(a => ["p", a]));
      system.BroadcastEvent(ev);
    }
  }

  return (
    <AsyncButton
      className={isFollowing ? `${baseClassname} secondary` : `${baseClassname} primary`}
      disabled={readonly}
      onClick={async e => {
        e.stopPropagation();
        await (isFollowing ? unfollow(pubkey) : follow(pubkey));
      }}>
      {isFollowing ? <FormattedMessage {...messages.Unfollow} /> : <FormattedMessage {...messages.Follow} />}
    </AsyncButton>
  );
}
