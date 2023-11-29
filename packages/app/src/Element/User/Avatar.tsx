import "./Avatar.css";

import { ReactNode, useEffect, useState } from "react";
import type { UserMetadata } from "@snort/system";
import classNames from "classnames";

import { defaultAvatar, getDisplayName } from "@/SnortUtils";
import { ProxyImg } from "@/Element/ProxyImg";
import Icon from "@/Icons/Icon";

interface AvatarProps {
  pubkey: string;
  user?: UserMetadata;
  onClick?: () => void;
  size?: number;
  image?: string;
  imageOverlay?: ReactNode;
  icons?: ReactNode;
  className?: string;
}

const Avatar = ({ pubkey, user, size, onClick, image, imageOverlay, icons, className }: AvatarProps) => {
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(image ?? user?.picture ?? defaultAvatar(pubkey));
  }, [user, image, pubkey]);

  const s = size ?? 120;
  const style = {} as React.CSSProperties;
  if (size) {
    style.width = `${size}px`;
    style.height = `${size}px`;
  }

  const domain = user?.nip05 && user.nip05.split("@")[1];
  return (
    <div
      onClick={onClick}
      style={style}
      className={classNames("avatar relative flex items-center justify-center", { "with-overlay": imageOverlay }, className)}
      data-domain={domain?.toLowerCase()}
      title={getDisplayName(user, "")}>
      <ProxyImg
        className="rounded-full object-cover aspect-square"
        src={url}
        size={s}
        alt={getDisplayName(user, "")}
        promptToLoadDirectly={false}
        missingImageElement={<Icon name="x" className="warning" />}
      />
      {icons && <div className="icons">{icons}</div>}
      {imageOverlay && <div className="overlay">{imageOverlay}</div>}
    </div>
  );
};

export default Avatar;
