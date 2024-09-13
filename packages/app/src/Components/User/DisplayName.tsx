import "./DisplayName.css";

import { HexKey, UserMetadata } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import classNames from "classnames";
import { useMemo } from "react";

import { getDisplayNameOrPlaceHolder } from "@/Utils";

interface DisplayNameProps {
  pubkey: HexKey;
  user?: UserMetadata | undefined;
}

const DisplayName = ({ pubkey, user }: DisplayNameProps) => {
  const profile = useUserProfile(user ? undefined : pubkey) ?? user;
  const [name, isPlaceHolder] = useMemo(() => getDisplayNameOrPlaceHolder(profile, pubkey), [profile, pubkey]);

  return <span className={classNames({ placeholder: isPlaceHolder })}>{name}</span>;
};

export default DisplayName;
