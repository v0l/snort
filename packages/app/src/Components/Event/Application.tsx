import { mapEventToProfile, TaggedNostrEvent } from "@snort/system";
import { FormattedMessage } from "react-intl";

import KindName from "../kind-name";
import Avatar from "../User/Avatar";
import DisplayName from "../User/DisplayName";
import ProfileImage from "../User/ProfileImage";

export function ApplicationHandler({ ev }: { ev: TaggedNostrEvent }) {
  const profile = mapEventToProfile(ev);
  const kinds = ev.tags
    .filter(a => a[0] === "k")
    .map(a => Number(a[1]))
    .sort((a, b) => a - b);
  return (
    <div className="p flex gap-2 flex-col">
      <div className="flex items-center gap-2 text-xl">
        <Avatar user={profile} pubkey={""} size={120} />
        <div className="flex flex-col gap-2">
          <DisplayName user={profile} pubkey={""} />
          <div className="text-sm  flex items-center gap-2">
            <div className="text-gray-light">
              <FormattedMessage defaultMessage="Published by" />
            </div>
            <ProfileImage className="inline" pubkey={ev.pubkey} size={30} link="" />
          </div>
        </div>
      </div>
      <FormattedMessage defaultMessage="Supported Kinds:" />
      <div className="flex flex-wrap">
        {kinds.map(a => (
          <div key={a} className="pill">
            <KindName kind={a} />
          </div>
        ))}
      </div>
    </div>
  );
}
