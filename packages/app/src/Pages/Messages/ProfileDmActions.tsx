import { decodeTLV, TLVEntryType } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import useModeration from "@/Hooks/useModeration";
import Avatar from "@/Element/User/Avatar";
import { getDisplayName } from "@/SnortUtils";
import Text from "@/Element/Text";
import Icon from "@/Icons/Icon";
import { FormattedMessage } from "react-intl";
import React from "react";

export default function ProfileDmActions({ id }: { id: string }) {
  const authors = decodeTLV(id)
    .filter(a => a.type === TLVEntryType.Author)
    .map(a => a.value as string);
  const pubkey = authors[0];
  const profile = useUserProfile(pubkey);
  const { block, unblock, isBlocked } = useModeration();

  function truncAbout(s?: string) {
    if ((s?.length ?? 0) > 200) {
      return `${s?.slice(0, 200)}...`;
    }
    return s;
  }

  const blocked = isBlocked(pubkey);
  return (
    <>
      <Avatar pubkey={pubkey} user={profile} size={210} />
      <h2>{getDisplayName(profile, pubkey)}</h2>
      <p>
        <Text
          id={pubkey}
          content={truncAbout(profile?.about) ?? ""}
          tags={[]}
          creator={pubkey}
          disableMedia={true}
          depth={0}
        />
      </p>

      <div className="settings-row" onClick={() => (blocked ? unblock(pubkey) : block(pubkey))}>
        <Icon name="block" />
        {blocked ? (
          <FormattedMessage defaultMessage="Unblock" id="nDejmx" />
        ) : (
          <FormattedMessage defaultMessage="Block" id="Up5U7K" />
        )}
      </div>
    </>
  );
}
