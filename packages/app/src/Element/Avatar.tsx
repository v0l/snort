import "./Avatar.css";
import Nostrich from "nostrich.webp";

import { CSSProperties, useEffect, useState } from "react";
import type { UserMetadata } from "@snort/nostr";

import useImgProxy from "Hooks/useImgProxy";

const Avatar = ({ user, ...rest }: { user?: UserMetadata; onClick?: () => void }) => {
  const [url, setUrl] = useState<string>(Nostrich);
  const { proxy } = useImgProxy();

  useEffect(() => {
    if (user?.picture) {
      const url = proxy(user.picture, 120);
      setUrl(url);
    }
  }, [user]);

  const backgroundImage = `url(${url})`;
  const style = { "--img-url": backgroundImage } as CSSProperties;
  const domain = user?.nip05 && user.nip05.split("@")[1];
  return <div {...rest} style={style} className="avatar" data-domain={domain?.toLowerCase()}></div>;
};

export default Avatar;
