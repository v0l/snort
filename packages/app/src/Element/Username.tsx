import { MouseEvent } from "react";
import { useNavigate, Link } from "react-router-dom";

import { HexKey } from "@snort/nostr";

import { useUserProfile } from "Hooks/useUserProfile";
import { profileLink } from "SnortUtils";

export default function Username({ pubkey, onLinkVisit }: { pubkey: HexKey; onLinkVisit(): void }) {
  const user = useUserProfile(pubkey);
  const navigate = useNavigate();

  function onClick(ev: MouseEvent) {
    ev.preventDefault();
    onLinkVisit();
    navigate(profileLink(pubkey));
  }

  return user ? (
    <Link to={profileLink(pubkey)} onClick={onClick}>
      {user.name || pubkey.slice(0, 12)}
    </Link>
  ) : null;
}
