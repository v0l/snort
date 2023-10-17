import { NostrLink, NostrPrefix } from "@snort/system";
import { useUserProfile } from "@snort/system-react";

import DisplayName from "Element/User/DisplayName";
import { ProfileLink } from "Element/User/ProfileLink";

export default function Mention({ link }: { link: NostrLink }) {
  const profile = useUserProfile(link.id);

  if (link.type !== NostrPrefix.Profile && link.type !== NostrPrefix.PublicKey) return;

  return (
    <ProfileLink pubkey={link.id} user={profile} onClick={e => e.stopPropagation()}>
      @<DisplayName user={profile} pubkey={link.id} />
    </ProfileLink>
  );
}
