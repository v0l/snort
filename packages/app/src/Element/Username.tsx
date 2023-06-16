import { MouseEvent } from "react";
import { useNavigate, Link } from "react-router-dom";

import { HexKey } from "@snort/system";
import { useUserProfile } from "@snort/system-react";

import { profileLink } from "SnortUtils";
import { System } from "index";

export default function Username({ pubkey, onLinkVisit }: { pubkey: HexKey; onLinkVisit(): void }) {
  const user = useUserProfile(System, pubkey);
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
