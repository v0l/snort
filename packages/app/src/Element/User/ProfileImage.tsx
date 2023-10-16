import "./ProfileImage.css";

import React, { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HexKey, UserMetadata } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import { useHover } from "@uidotdev/usehooks";
import { ControlledMenu } from "@szhsin/react-menu";
import classNames from "classnames";

import { profileLink } from "SnortUtils";
import Avatar from "Element/User/Avatar";
import Nip05 from "Element/User/Nip05";
import useLogin from "Hooks/useLogin";
import Icon from "Icons/Icon";
import DisplayName from "./DisplayName";
import Text from "Element/Text";
import FollowButton from "Element/User/FollowButton";
import { UserWebsiteLink } from "Element/User/UserWebsiteLink";

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
  showProfileCard?: boolean;
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
  showProfileCard,
}: ProfileImageProps) {
  const user = useUserProfile(profile ? "" : pubkey) ?? profile;
  const nip05 = defaultNip ? defaultNip : user?.nip05;
  const { follows } = useLogin();
  const doesFollow = follows.item.includes(pubkey);
  const [ref, hovering] = useHover<HTMLDivElement>();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [t, setT] = useState<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (hovering) {
      const tn = setTimeout(() => {
        setShowProfileMenu(true);
      }, 1000);
      setT(tn);
    } else {
      if (t) {
        clearTimeout(t);
        setT(undefined);
      }
    }
  }, [hovering]);

  function handleClick(e: React.MouseEvent) {
    if (link === "") {
      e.preventDefault();
      onClick?.(e);
    }
  }

  function inner() {
    return (
      <>
        <div className="avatar-wrapper" ref={ref}>
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

  function profileCard() {
    if (showProfileCard ?? true) {
      return (
        <ControlledMenu
          state={showProfileMenu ? "open" : "closed"}
          anchorRef={ref}
          menuClassName="profile-card"
          onClose={() => setShowProfileMenu(false)}>
          <div className="flex-column g8">
            <div className="flex f-space">
              <ProfileImage pubkey={""} profile={user} showProfileCard={false} link="" />
              <div className="flex g8">
                {/*<button type="button" onClick={() => {
                  LoginStore.loginWithPubkey(pubkey, LoginSessionType.PublicKey, undefined, undefined, undefined, true);
                }}>
                  <FormattedMessage defaultMessage="Stalk" />
              </button>*/}
                <FollowButton pubkey={pubkey} />
              </div>
            </div>
            <Text
              id={`profile-card-${pubkey}`}
              content={user?.about ?? ""}
              creator={pubkey}
              tags={[]}
              disableMedia={true}
              disableLinkPreview={true}
              truncate={250}
            />
            <UserWebsiteLink user={user} />
          </div>
        </ControlledMenu>
      );
    }
    return null;
  }

  if (link === "") {
    return (
      <>
        <div className={classNames("pfp", className)} onClick={handleClick}>
          {inner()}
        </div>
        {profileCard()}
      </>
    );
  } else {
    return (
      <>
        <Link
          className={classNames("pfp", className)}
          to={link === undefined ? profileLink(pubkey) : link}
          onClick={handleClick}>
          {inner()}
        </Link>
        {profileCard()}
      </>
    );
  }
}
