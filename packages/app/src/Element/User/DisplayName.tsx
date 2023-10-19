import "./DisplayName.css";

import { useMemo } from "react";
import { HexKey, UserMetadata } from "@snort/system";
import { getDisplayNameOrPlaceHolder } from "SnortUtils";

interface DisplayNameProps {
  pubkey: HexKey;
  user: UserMetadata | undefined;
}

const DisplayName = ({ pubkey, user }: DisplayNameProps) => {
  const [name, isPlaceHolder] = useMemo(() => getDisplayNameOrPlaceHolder(user, pubkey), [user, pubkey]);

  if (isPlaceHolder) {
    return <span className="placeholder">{name}</span>;
  }
  return name;
};

export default DisplayName;
