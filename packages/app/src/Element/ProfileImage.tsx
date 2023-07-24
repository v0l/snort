import "./ProfileImage.css";

import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { HexKey, NostrPrefix, UserMetadata } from "@snort/system";
import { useUserProfile } from "@snort/system-react";

import { hexToBech32, profileLink } from "SnortUtils";
import Avatar from "Element/Avatar";
import Nip05 from "Element/Nip05";
import { System } from "index";

export interface ProfileImageProps {
  pubkey: HexKey;
  subHeader?: JSX.Element;
  showUsername?: boolean;
  className?: string;
  link?: string;
  defaultNip?: string;
  verifyNip?: boolean;
  overrideUsername?: string;
  profile?: UserMetadata;
}

export default function ProfileImage({
  pubkey,
  subHeader,
  showUsername = true,
  className,
  link,
  defaultNip,
  verifyNip,
  overrideUsername,
  profile,
}: ProfileImageProps) {
  const user = profile ?? useUserProfile(System, pubkey);
  const nip05 = defaultNip ? defaultNip : user?.nip05;

  const name = useMemo(() => {
    return overrideUsername ?? getDisplayName(user, pubkey);
  }, [user, pubkey, overrideUsername]);

  function handleClick(e: React.MouseEvent) {
    if (link === "") {
      e.preventDefault();
    }
  }

  return (
    <Link
      className={`pfp${className ? ` ${className}` : ""}`}
      to={link === undefined ? profileLink(pubkey) : link}
      onClick={handleClick}>
      <div className="avatar-wrapper">
        <Avatar user={user} />
      </div>
      {showUsername && (
        <div className="f-ellipsis">
          <div className="username">
            <div>{name.trim()}</div>
            {nip05 && <Nip05 nip05={nip05} pubkey={pubkey} verifyNip={verifyNip} />}
          </div>
          <div className="subheader">{subHeader}</div>
        </div>
      )}
    </Link>
  );
}

export function getDisplayName(user: UserMetadata | undefined, pubkey: HexKey) {
  let name = hexToBech32(NostrPrefix.PublicKey, pubkey).substring(0, 12);
  if (typeof user?.display_name === "string" && user.display_name.length > 0) {
    name = user.display_name;
  } else if (typeof user?.name === "string" && user.name.length > 0) {
    name = user.name;
  }
  return name;
}
