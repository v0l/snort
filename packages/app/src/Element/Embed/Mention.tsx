import { useMemo } from "react";
import { Link } from "react-router-dom";
import { HexKey } from "@snort/system";

import { useUserProfile } from "@snort/system-react";
import { profileLink } from "SnortUtils";
import { getDisplayName } from "Element/ProfileImage";

export default function Mention({ pubkey, relays }: { pubkey: HexKey; relays?: Array<string> | string }) {
  const user = useUserProfile(pubkey);

  const name = useMemo(() => {
    return getDisplayName(user, pubkey);
  }, [user, pubkey]);

  return (
    <Link to={profileLink(pubkey, relays)} onClick={e => e.stopPropagation()}>
      @{name}
    </Link>
  );
}
