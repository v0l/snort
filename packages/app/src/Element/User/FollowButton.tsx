import "./FollowButton.css";
import FormattedMessage from "Element/FormattedMessage";
import { HexKey } from "@snort/system";

import useEventPublisher from "Hooks/useEventPublisher";
import { parseId } from "SnortUtils";
import useLogin from "Hooks/useLogin";
import AsyncButton from "Element/AsyncButton";
import { System } from "index";

import messages from "../messages";
import { FollowsFeed } from "Cache";

export interface FollowButtonProps {
  pubkey: HexKey;
  className?: string;
}
export default function FollowButton(props: FollowButtonProps) {
  const pubkey = parseId(props.pubkey);
  const publisher = useEventPublisher();
  const { follows, relays, readonly } = useLogin(s => ({ follows: s.follows, relays: s.relays, readonly: s.readonly }));
  const isFollowing = follows.item.includes(pubkey);
  const baseClassname = `${props.className ? ` ${props.className}` : ""}follow-button`;

  async function follow(pubkey: HexKey) {
    if (publisher) {
      const ev = await publisher.contactList([pubkey, ...follows.item], relays.item);
      await FollowsFeed.backFill(System, [pubkey]);
      System.BroadcastEvent(ev);
    }
  }

  async function unfollow(pubkey: HexKey) {
    if (publisher) {
      const ev = await publisher.contactList(
        follows.item.filter(a => a !== pubkey),
        relays.item,
      );
      System.BroadcastEvent(ev);
    }
  }

  return (
    <AsyncButton
      className={isFollowing ? `${baseClassname} secondary` : baseClassname}
      disabled={readonly}
      onClick={() => (isFollowing ? unfollow(pubkey) : follow(pubkey))}>
      {isFollowing ? <FormattedMessage {...messages.Unfollow} /> : <FormattedMessage {...messages.Follow} />}
    </AsyncButton>
  );
}
