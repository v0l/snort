import "./ProfileImage.css";

import React, { ReactNode } from "react";
import { Link } from "react-router-dom";
import { HexKey, UserMetadata } from "@snort/system";
import { useUserProfile } from "@snort/system-react";

import { profileLink } from "SnortUtils";
import Avatar from "Element/User/Avatar";
import Nip05 from "Element/User/Nip05";
import useLogin from "Hooks/useLogin";
import Icon from "Icons/Icon";
import DisplayName from "./DisplayName";

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
              {overrideUsername ? overrideUsername : <DisplayName pubkey={pubkey} user={user} />}
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
