import "./ProfileImage.css";

import React, { useMemo } from "react";
import { HexKey, NostrPrefix } from "@snort/nostr";

import { useUserProfile } from "Hooks/useUserProfile";
import { hexToBech32, profileLink } from "Util";
import Avatar from "Element/Avatar";
import Nip05 from "Element/Nip05";
import { MetadataCache } from "Cache";
import { Link } from "react-router-dom";
import { ProxyImg } from "./ProxyImg";

export interface ProfileImageProps {
  pubkey: HexKey;
  subHeader?: JSX.Element;
  showUsername?: boolean;
  className?: string;
  link?: string;
  defaultNip?: string;
  verifyNip?: boolean;
  overrideUsername?: string;
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
}: ProfileImageProps) {
  const user = useUserProfile(pubkey);
  const nip05 = defaultNip ? defaultNip : user?.nip05;

  const name = useMemo(() => {
    return overrideUsername ?? getDisplayName(user, pubkey);
  }, [user, pubkey, overrideUsername]);

  function handleClick(e: React.MouseEvent) {
    if (link === "") {
      e.preventDefault();
    }
  }

  function extractCustomEmoji(name: string) {
    return name.split(" ").map(word => {
      const isEmoji = word[0] === ":" && word[word.length - 1] === ":";
      const emojiTag = isEmoji && user?.emojis?.find(tag => tag[1] === word.substring(1, word.length - 1));
      if (emojiTag) {
        return (
          <>
            <ProxyImg src={emojiTag[2]} size={15} className="custom-emoji" />{" "}
          </>
        );
      } else {
        return word + " ";
      }
    });
  }

  return (
    <Link
      className={`pfp${className ? ` ${className}` : ""}`}
      to={link === undefined ? profileLink(pubkey) : link}
      onClick={handleClick}
      replace={true}>
      <div className="avatar-wrapper">
        <Avatar user={user} />
      </div>
      {showUsername && (
        <div className="f-ellipsis">
          <div className="username">
            <div>{extractCustomEmoji(name.trim())}</div>
            {nip05 && <Nip05 nip05={nip05} pubkey={pubkey} verifyNip={verifyNip} />}
          </div>
          <div className="subheader">{subHeader}</div>
        </div>
      )}
    </Link>
  );
}

export function getDisplayName(user: MetadataCache | undefined, pubkey: HexKey) {
  let name = hexToBech32(NostrPrefix.PublicKey, pubkey).substring(0, 12);
  if (typeof user?.display_name === "string" && user.display_name.length > 0) {
    name = user.display_name;
  } else if (typeof user?.name === "string" && user.name.length > 0) {
    name = user.name;
  }
  return name;
}
