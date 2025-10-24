import { NostrLink } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import { ReactNode } from "react";

import DisplayName from "@/Components/User/DisplayName";
import { ProfileCardWrapper } from "@/Components/User/ProfileCardWrapper";
import { ProfileLink } from "@/Components/User/ProfileLink";
import { NostrPrefix } from "@snort/shared";

export default function Mention({ link, prefix }: { link: NostrLink; prefix?: ReactNode }) {
  const profile = useUserProfile(link.id);

  if (link.type !== NostrPrefix.Profile && link.type !== NostrPrefix.PublicKey) return;

  return (
    <ProfileCardWrapper pubkey={link.id} user={profile}>
      <span className="text-highlight">
        <ProfileLink pubkey={link.id} user={profile} onClick={e => e.stopPropagation()}>
          {prefix ?? "@"}
          <DisplayName user={profile} pubkey={link.id} />
        </ProfileLink>
      </span>
    </ProfileCardWrapper>
  );
}
