import { FormattedMessage } from "react-intl";
import { HexKey } from "@snort/system";

import useEventPublisher from "Hooks/useEventPublisher";
import { parseId } from "SnortUtils";
import useLogin from "Hooks/useLogin";
import AsyncButton from "Element/AsyncButton";

import messages from "../messages";
import { FollowsFeed } from "Cache";

export interface FollowButtonProps {
  pubkey: HexKey;
  className?: string;
}
export default function FollowButton(props: FollowButtonProps) {
  const pubkey = parseId(props.pubkey);
  const { publisher, system } = useEventPublisher();
  const { follows, relays, readonly } = useLogin(s => ({ follows: s.follows, relays: s.relays, readonly: s.readonly }));
  const isFollowing = follows.item.includes(pubkey);
  const baseClassname = props.className ? `${props.className} ` : "";

  async function follow(pubkey: HexKey) {
    if (publisher) {
      const ev = await publisher.contactList([pubkey, ...follows.item], relays.item);
      system.BroadcastEvent(ev);
      await FollowsFeed.backFill(system, [pubkey]);
    }
  }

  async function unfollow(pubkey: HexKey) {
    if (publisher) {
      const ev = await publisher.contactList(
        follows.item.filter(a => a !== pubkey),
        relays.item,
      );
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
