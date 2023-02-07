import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useUserProfile } from "Feed/ProfileFeed";
import { HexKey } from "Nostr";
import { hexToBech32, profileLink } from "Util";

export default function Mention({ pubkey }: { pubkey: HexKey }) {
  const user = useUserProfile(pubkey);

  const name = useMemo(() => {
    let name = hexToBech32("npub", pubkey).substring(0, 12);
    if (user?.display_name !== undefined && user.display_name.length > 0) {
      name = user.display_name;
    } else if (user?.name !== undefined && user.name.length > 0) {
      name = user.name;
    }
    return name;
  }, [user, pubkey]);

  return (
    <Link to={profileLink(pubkey)} onClick={(e) => e.stopPropagation()}>
      @{name}
    </Link>
  );
}
