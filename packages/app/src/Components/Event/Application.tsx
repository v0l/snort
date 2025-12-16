import { mapEventToProfile, type TaggedNostrEvent } from "@snort/system";
import { FormattedMessage } from "react-intl";

import KindName from "../kind-name";
import Avatar from "../User/Avatar";
import DisplayName from "../User/DisplayName";
import ProfileImage from "../User/ProfileImage";
import Icon from "../Icons/Icon";

export function ApplicationHandler({ ev }: { ev: TaggedNostrEvent }) {
  const profile = mapEventToProfile(ev);
  const kinds = ev.tags
    .filter(a => a[0] === "k")
    .map(a => Number(a[1]))
    .sort((a, b) => a - b);
  const sourceLink = ev.tags.find(a => a[0] === "r" && a[2] === "source")?.[1];
  return (
    <div className="px-3 py-2 flex gap-2 flex-col">
      <div className="flex items-center gap-2 text-xl">
        <Avatar user={profile} pubkey={""} size={120} />
        <div className="flex flex-col gap-2">
          <DisplayName user={profile} pubkey={""} />
          <div className="text-sm flex flex-col gap-2">
            <div className="text-neutral-400">
              <FormattedMessage defaultMessage="Published by" />
            </div>
            <ProfileImage pubkey={ev.pubkey} size={30} />
            {sourceLink && (
              <a href={sourceLink} className="flex items-center gap-1" target="_blank">
                <Icon name="link" size={14} />
                <FormattedMessage defaultMessage="Source Code" />
              </a>
            )}
          </div>
        </div>
      </div>
      <FormattedMessage defaultMessage="Supported Kinds:" />
      <div className="flex flex-wrap gap-1">
        {kinds.map(a => (
          <div key={a} className="bg-layer-1 px-2 py-1 rounded-lg">
            <KindName kind={a} />
          </div>
        ))}
      </div>
    </div>
  );
}
