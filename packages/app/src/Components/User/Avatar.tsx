import type { UserMetadata } from "@snort/system";
import classNames from "classnames";
import { forwardRef, HTMLProps, ReactNode, useMemo } from "react";

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

const Avatar = forwardRef<
  HTMLDivElement,
  AvatarProps & Omit<HTMLProps<HTMLDivElement>, "onClick" | "style" | "className">
>(function (
  { pubkey, user, size = 48, onClick, image, imageOverlay, icons, className, showTitle = true, children, ...others },
  ref,
) {
  const defaultImg = defaultAvatar(pubkey);
  const url = useMemo(() => {
    if ((image?.length ?? 0) > 0) return image;
    if ((user?.picture?.length ?? 0) > 0) return user?.picture;
    return defaultImg;
  }, [user, image, pubkey]);

  size ??= 120;

  const domain = user?.nip05 && user.nip05.split("@")[1];
  return (
    <div
      ref={ref}
      onClick={onClick}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
      className={classNames(
        "relative rounded-full aspect-square flex items-center justify-center gap-2 bg-neutral-600 z-1",
        className,
      )}
      data-domain={domain?.toLowerCase()}
      title={showTitle ? getDisplayName(user, "") : undefined}
      {...others}>
      <ProxyImg
        className="absolute rounded-full w-full h-full object-cover"
        src={url}
        bypassProxy={url === defaultImg}
        size={size}
        alt={getDisplayName(user, "")}
        promptToLoadDirectly={false}
      />
      {icons && (
        <div
          className="absolute flex items-center justify-center w-full h-full origin-center"
          style={{
            transform: "rotate(-135deg) translateY(50%)",
          }}>
          <div
            style={{
              transform: "rotate(135deg)",
            }}>
            {icons}
          </div>
        </div>
      )}
      {imageOverlay && (
        <div className="absolute rounded-full bg-black/40 w-full h-full flex items-center justify-center">
          {imageOverlay}
        </div>
      )}
      {children}
    </div>
  );
});
export default Avatar;
