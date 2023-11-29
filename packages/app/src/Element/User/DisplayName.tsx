import "./DisplayName.css";
import { useMemo } from "react";
import { HexKey, UserMetadata } from "@snort/system";
import { getDisplayNameOrPlaceHolder } from "@/SnortUtils";
import { useUserProfile } from "@snort/system-react";
import classNames from "classnames";

interface DisplayNameProps {
  pubkey: HexKey;
  user: UserMetadata | undefined;
}

const DisplayName = ({ pubkey }: DisplayNameProps) => {
  const profile = useUserProfile(pubkey);
  const [name, isPlaceHolder] = useMemo(() => getDisplayNameOrPlaceHolder(profile, pubkey), [profile, pubkey]);

  return <span className={classNames({ placeholder: isPlaceHolder })}>{name}</span>;
};

export default DisplayName;
