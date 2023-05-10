import { ReactNode } from "react";
import { FormattedMessage } from "react-intl";
import { HexKey } from "@snort/nostr";

import useEventPublisher from "Feed/EventPublisher";
import ProfilePreview from "Element/ProfilePreview";
import useLogin from "Hooks/useLogin";

import messages from "./messages";

export interface FollowListBaseProps {
  pubkeys: HexKey[];
  title?: ReactNode | string;
  showFollowAll?: boolean;
  showAbout?: boolean;
}
export default function FollowListBase({ pubkeys, title, showFollowAll, showAbout }: FollowListBaseProps) {
  const publisher = useEventPublisher();
  const { follows, relays } = useLogin();

  async function followAll() {
    if (publisher) {
      const ev = await publisher.contactList([...pubkeys, ...follows.item], relays.item);
      publisher.broadcast(ev);
    }
  }

  return (
    <>
      {(showFollowAll ?? true) && (
        <div className="flex mt10 mb10">
          <div className="f-grow bold">{title}</div>
          <button className="transparent" type="button" onClick={() => followAll()}>
            <FormattedMessage {...messages.FollowAll} />
          </button>
        </div>
      )}
      {pubkeys?.map(a => (
        <ProfilePreview pubkey={a} key={a} options={{ about: showAbout }} />
      ))}
    </>
  );
}
