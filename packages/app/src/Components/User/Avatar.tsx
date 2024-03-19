import "./Avatar.css";

import type { UserMetadata } from "@snort/system";
import classNames from "classnames";
import { ReactNode, useMemo } from "react";

import { ProxyImg } from "@/Components/ProxyImg";
import { defaultAvatar, getDisplayName } from "@/Utils";

interface AvatarProps {
  pubkey: string;
  user?: UserMetadata;
  onClick?: () => void;
  size?: number;
  image?: string;
  imageOverlay?: ReactNode;
  icons?: ReactNode;
  showTitle?: boolean;
  className?: string;
}

const Avatar = ({
  pubkey,
  user,
  size,
  onClick,
  image,
  imageOverlay,
  icons,
  className,
  showTitle = true,
}: AvatarProps) => {
  const defaultImg = defaultAvatar(pubkey);
  const url = useMemo(() => {
    if ((image?.length ?? 0) > 0) return image;
    if ((user?.picture?.length ?? 0) > 0) return user?.picture;
    return defaultImg;
  }, [user, image, pubkey]);

  const s = size ?? 120;
  const style = {} as React.CSSProperties;
  if (size) {
    style.width = `${size}px`;
    style.height = `${size}px`;
  }

  const domain = user?.nip05 && user.nip05.split("@")[1];
  const isDefault = url === defaultImg;
  return (
    <div
      onClick={onClick}
      style={style}
      className={classNames(
        "avatar relative flex items-center justify-center",
        { "with-overlay": imageOverlay },
        { "outline outline-2 outline-nostr-purple m-[2px]": isDefault },
        className,
      )}
      data-domain={domain?.toLowerCase()}
      title={showTitle ? getDisplayName(user, "") : undefined}>
      <ProxyImg
        className="rounded-full object-cover aspect-square"
        src={url}
        size={s}
        alt={getDisplayName(user, "")}
        promptToLoadDirectly={false}
      />
      {icons && <div className="icons">{icons}</div>}
      {imageOverlay && <div className="overlay">{imageOverlay}</div>}
    </div>
  );
};

export default Avatar;
