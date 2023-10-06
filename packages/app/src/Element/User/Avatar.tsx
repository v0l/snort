import "./Avatar.css";

import { CSSProperties, ReactNode, useEffect, useState } from "react";
import type { UserMetadata } from "@snort/system";

import useImgProxy from "Hooks/useImgProxy";
import { getDisplayName } from "Element/User/DisplayName";
import { defaultAvatar } from "SnortUtils";

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
  const { proxy } = useImgProxy();

  const s = size ?? 120;
  useEffect(() => {
    const url = image ?? user?.picture;
    if (url) {
      const proxyUrl = proxy(url, s);
      setUrl(proxyUrl);
    } else {
      setUrl(defaultAvatar(pubkey));
    }
  }, [user, image]);

  const backgroundImage = `url(${url})`;
  const style = { "--img-url": backgroundImage } as CSSProperties;
  if (size) {
    style.width = `${s}px`;
    style.height = `${s}px`;
  }
  const domain = user?.nip05 && user.nip05.split("@")[1];
  return (
    <div
      onClick={onClick}
      style={style}
      className={`avatar${imageOverlay ? " with-overlay" : ""} ${className ?? ""}`}
      data-domain={domain?.toLowerCase()}
      title={getDisplayName(user, "")}>
      {icons && <div className="icons">{icons}</div>}
      {imageOverlay && <div className="overlay">{imageOverlay}</div>}
    </div>
  );
};

export default Avatar;
