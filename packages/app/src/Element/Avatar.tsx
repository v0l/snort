import "./Avatar.css";
import Nostrich from "nostrich.webp";

import { CSSProperties, useEffect, useState } from "react";
import type { UserMetadata } from "@snort/system";

import useImgProxy from "Hooks/useImgProxy";

interface AvatarProps {
  user?: UserMetadata;
  onClick?: () => void;
  size?: number;
}
const Avatar = ({ user, size, onClick }: AvatarProps) => {
  const [url, setUrl] = useState<string>(Nostrich);
  const { proxy } = useImgProxy();

  useEffect(() => {
    if (user?.picture) {
      const url = proxy(user.picture, size ?? 120);
      setUrl(url);
    } else {
      setUrl(Nostrich);
    }
  }, [user]);

  const backgroundImage = `url(${url})`;
  const style = { "--img-url": backgroundImage } as CSSProperties;
  const domain = user?.nip05 && user.nip05.split("@")[1];
  return <div onClick={onClick} style={style} className="avatar" data-domain={domain?.toLowerCase()}></div>;
};

export default Avatar;
