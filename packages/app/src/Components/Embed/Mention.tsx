import { NostrLink, NostrPrefix } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import { useCallback, useRef, useState } from "react";

import DisplayName from "@/Components/User/DisplayName";
import { ProfileCard } from "@/Components/User/ProfileCard";
import { ProfileLink } from "@/Components/User/ProfileLink";

export default function Mention({ link }: { link: NostrLink }) {
  const profile = useUserProfile(link.id);
  const [isHovering, setIsHovering] = useState(false);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = useCallback(() => {
    hoverTimeoutRef.current && clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setIsHovering(true), 100); // Adjust timeout as needed
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoverTimeoutRef.current && clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setIsHovering(false), 300); // Adjust timeout as needed
  }, []);

  if (link.type !== NostrPrefix.Profile && link.type !== NostrPrefix.PublicKey) return;

  return (
    <span className="highlight" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <ProfileLink pubkey={link.id} link={link} user={profile} onClick={e => e.stopPropagation()}>
        @<DisplayName user={profile} pubkey={link.id} />
      </ProfileLink>
      {isHovering && <ProfileCard pubkey={link.id} user={profile} show={true} />}
    </span>
  );
}
