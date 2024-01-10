import { forwardRef, HTMLProps, ReactNode, useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";

import useImgProxy from "@/Hooks/useImgProxy";
import { getUrlHostname } from "@/Utils";

type ProxyImgProps = HTMLProps<HTMLImageElement> & {
  size?: number;
  sha256?: string;
  className?: string;
  promptToLoadDirectly?: boolean;
  missingImageElement?: ReactNode;
};

export const ProxyImg = forwardRef<HTMLImageElement, ProxyImgProps>(function ProxyImg(
  { src, size, className, promptToLoadDirectly, missingImageElement, sha256, ...props }: ProxyImgProps,
  ref,
) {
  const { proxy } = useImgProxy();
  const [loadFailed, setLoadFailed] = useState(false);
  const [bypass, setBypass] = useState(CONFIG.media.bypassImgProxyError);
  const [imgSrc, setImgSrc] = useState<string>(proxy(src, size, sha256));

  useEffect(() => {
    setLoadFailed(false);
    if (src) {
      setImgSrc(proxy(src, size, sha256));
    }
  }, [src, size, sha256]);

  if (loadFailed && !bypass && (promptToLoadDirectly ?? true)) {
    return (
      <div
        className="note-invoice error"
        onClick={e => {
          e.stopPropagation();
          setBypass(true);
        }}>
        <FormattedMessage
          defaultMessage="Failed to proxy image from {host}, click here to load directly"
          id="65BmHb"
          values={{
            host: getUrlHostname(src),
          }}
        />
      </div>
    );
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.warn("ImgLoadOnError", src, e);
    if (props.onError) {
      props.onError(e);
    } else {
      if (bypass && imgSrc !== src) {
        setImgSrc(src ?? "");
      } else {
        setLoadFailed(true);
      }
    }
  };

  if (!imgSrc || loadFailed)
    return (
      missingImageElement ?? (
        <div>
          <FormattedMessage defaultMessage="Image not available" id="Y7FG5M" />
        </div>
      )
    );

  return (
    <img
      {...props}
      ref={ref}
      src={imgSrc}
      width={size}
      height={size}
      className={className}
      onError={handleImageError}
    />
  );
});
