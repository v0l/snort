import "./ProfileImage.css";

import React, { ReactNode, useMemo } from "react";
import { Link } from "react-router-dom";
import { HexKey, NostrPrefix, UserMetadata } from "@snort/system";
import { useUserProfile } from "@snort/system-react";

import { hexToBech32, profileLink } from "SnortUtils";
import Avatar from "Element/User/Avatar";
import Nip05 from "Element/User/Nip05";
import useLogin from "Hooks/useLogin";
import Icon from "Icons/Icon";
import AnimalName from "./AnimalName";

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
  size?: number;
  onClick?: (e: React.MouseEvent) => void;
  imageOverlay?: ReactNode;
  showFollowingMark?: boolean;
  icons?: ReactNode;
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
  size,
  imageOverlay,
  onClick,
  showFollowingMark = true,
  icons,
}: ProfileImageProps) {
  const user = useUserProfile(profile ? "" : pubkey) ?? profile;
  const nip05 = defaultNip ? defaultNip : user?.nip05;
  const { follows } = useLogin();
  const doesFollow = follows.item.includes(pubkey);

  const [name, isPlaceHolder] = useMemo(() => {
    return overrideUsername ? [overrideUsername, false] : getDisplayNameOrPlaceHolder(user, pubkey);
  }, [user, pubkey, overrideUsername]);

  function handleClick(e: React.MouseEvent) {
    if (link === "") {
      e.preventDefault();
      onClick?.(e);
    }
  }

  function inner() {
    return (
      <>
        <div className="avatar-wrapper">
          <Avatar
            pubkey={pubkey}
            user={user}
            size={size}
            imageOverlay={imageOverlay}
            icons={
              (doesFollow && showFollowingMark) || icons ? (
                <>
                  {icons}
                  {showFollowingMark && (
                    <div className="icon-circle">
                      <Icon name="check" className="success" size={10} />
                    </div>
                  )}
                </>
              ) : undefined
            }
          />
        </div>
        {showUsername && (
          <div className="f-ellipsis">
            <div className="flex g4 username">
              <div className={isPlaceHolder ? "placeholder" : ""}>{name.trim()}</div>
              {nip05 && <Nip05 nip05={nip05} pubkey={pubkey} verifyNip={verifyNip} />}
            </div>
            <div className="subheader">{subHeader}</div>
          </div>
        )}
      </>
    );
  }

  if (link === "") {
    return (
      <div className={`pfp${className ? ` ${className}` : ""}`} onClick={handleClick}>
        {inner()}
      </div>
    );
  } else {
    return (
      <Link
        className={`pfp${className ? ` ${className}` : ""}`}
        to={link === undefined ? profileLink(pubkey) : link}
        onClick={handleClick}>
        {inner()}
      </Link>
    );
  }
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
  return [name, isPlaceHolder];
}

export function getDisplayName(user: UserMetadata | undefined, pubkey: HexKey): string {
  let name = hexToBech32(NostrPrefix.PublicKey, pubkey).substring(0, 12);
  if (typeof user?.display_name === "string" && user.display_name.length > 0) {
    name = user.display_name;
  } else if (typeof user?.name === "string" && user.name.length > 0) {
    name = user.name;
  }
  return name;
}
