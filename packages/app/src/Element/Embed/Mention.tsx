import { Link } from "react-router-dom";
import { HexKey } from "@snort/system";

import { useUserProfile } from "@snort/system-react";
import { profileLink } from "SnortUtils";
import DisplayName from "../User/DisplayName";

export default function Mention({ pubkey, relays }: { pubkey: HexKey; relays?: Array<string> | string }) {
  const user = useUserProfile(pubkey);

  return (
    <Link to={profileLink(pubkey, relays)} onClick={e => e.stopPropagation()}>
      @<DisplayName user={user} pubkey={pubkey} />
    </Link>
  );
}
