import "./Avatar.css";
import Nostrich from "nostrich.webp";

import { CSSProperties, useEffect, useState } from "react";
import type { UserMetadata } from "@snort/system";

import useImgProxy from "Hooks/useImgProxy";
import { getDisplayName } from "Element/ProfileImage";

interface AvatarProps {
  user?: UserMetadata;
  onClick?: () => void;
  size?: number;
  image?: string;
}
const Avatar = ({ user, size, onClick, image }: AvatarProps) => {
  const [url, setUrl] = useState<string>(Nostrich);
  const { proxy } = useImgProxy();

  useEffect(() => {
    const url = image ?? user?.picture;
    if (url) {
      const proxyUrl = proxy(url, size ?? 120);
      setUrl(proxyUrl);
    } else {
      setUrl(Nostrich);
    }
  }, [user, image]);

  const backgroundImage = `url(${url})`;
  const style = { "--img-url": backgroundImage } as CSSProperties;
  const domain = user?.nip05 && user.nip05.split("@")[1];
  return (
    <div
      onClick={onClick}
      style={style}
      className="avatar"
      data-domain={domain?.toLowerCase()}
      title={getDisplayName(user, "")}></div>
  );
};

export default Avatar;
