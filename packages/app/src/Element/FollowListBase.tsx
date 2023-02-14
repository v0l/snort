import { ReactNode } from "react";
import { FormattedMessage } from "react-intl";

import useEventPublisher from "Feed/EventPublisher";
import { HexKey } from "@snort/nostr";
import ProfilePreview from "Element/ProfilePreview";

import messages from "./messages";

export interface FollowListBaseProps {
  pubkeys: HexKey[];
  title?: ReactNode | string;
}
export default function FollowListBase({ pubkeys, title }: FollowListBaseProps) {
  const publisher = useEventPublisher();

  async function followAll() {
    const ev = await publisher.addFollow(pubkeys);
    publisher.broadcast(ev);
  }

  return (
    <div className="main-content">
      <div className="flex mt10 mb10">
        <div className="f-grow bold">{title}</div>
        <button className="transparent" type="button" onClick={() => followAll()}>
          <FormattedMessage {...messages.FollowAll} />
        </button>
      </div>
      {pubkeys?.map(a => (
        <ProfilePreview pubkey={a} key={a} />
      ))}
    </div>
  );
}
