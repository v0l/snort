import { NostrLink, NostrPrefix } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import { useHover } from "@uidotdev/usehooks";

import DisplayName from "Element/User/DisplayName";
import { ProfileCard } from "Element/User/ProfileCard";
import { ProfileLink } from "Element/User/ProfileLink";

export default function Mention({ link }: { link: NostrLink }) {
  const [ref, hovering] = useHover<HTMLAnchorElement>();
  const profile = useUserProfile(link.id);

  if (link.type !== NostrPrefix.Profile && link.type !== NostrPrefix.PublicKey) return;

  return (
    <>
      <ProfileLink pubkey={link.id} link={link} user={profile} onClick={e => e.stopPropagation()}>
        <span ref={ref}>
          @<DisplayName user={profile} pubkey={link.id} />
        </span>
      </ProfileLink>
      <ProfileCard pubkey={link.id} user={profile} show={hovering} ref={ref} />
    </>
  );
}
