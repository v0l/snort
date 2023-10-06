import "./DisplayName.css";

import React, { useMemo } from "react";
import { HexKey, UserMetadata, NostrPrefix } from "@snort/system";
import AnimalName from "Element/User/AnimalName";
import { hexToBech32 } from "SnortUtils";

interface DisplayNameProps {
  pubkey: HexKey;
  user: UserMetadata | undefined;
}

export function getDisplayName(user: UserMetadata | undefined, pubkey: HexKey): string {
  return getDisplayNameOrPlaceHolder(user, pubkey)[0];
}

export function getDisplayNameOrPlaceHolder(user: UserMetadata | undefined, pubkey: HexKey): [string, boolean] {
  let name = hexToBech32(NostrPrefix.PublicKey, pubkey).substring(0, 12);
  let isPlaceHolder = false;

  if (typeof user?.display_name === "string" && user.display_name.length > 0) {
    name = user.display_name;
  } else if (typeof user?.name === "string" && user.name.length > 0) {
    name = user.name;
  } else if (pubkey && process.env.ANIMAL_NAME_PLACEHOLDERS) {
    name = AnimalName(pubkey);
    isPlaceHolder = true;
  }

  return [name.trim(), isPlaceHolder];
}

const DisplayName = ({ pubkey, user }: DisplayNameProps) => {
  const [name, isPlaceHolder] = useMemo(() => getDisplayNameOrPlaceHolder(user, pubkey), [user, pubkey]);

  return <span className={isPlaceHolder ? "placeholder" : ""}>{name}</span>;
};

export default DisplayName;
