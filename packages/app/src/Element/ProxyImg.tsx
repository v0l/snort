import useImgProxy from "@/Hooks/useImgProxy";
import React, { HTMLProps, ReactNode, forwardRef, useState, useMemo, useEffect } from "react";
import { FormattedMessage } from "react-intl";
import { getUrlHostname } from "@/SnortUtils";

type ProxyImgProps = HTMLProps<HTMLImageElement> & {
  size?: number;
  sha256?: string;
  className?: string;
  promptToLoadDirectly?: boolean;
  missingImageElement?: ReactNode;
};

export const ProxyImg = forwardRef<HTMLImageElement, ProxyImgProps>(
  ({ size, className, promptToLoadDirectly, missingImageElement, sha256, ...props }: ProxyImgProps, ref) => {
    const { proxy } = useImgProxy();
    const [loadFailed, setLoadFailed] = useState(false);
    const [bypass, setBypass] = useState(CONFIG.media.bypassImgProxyError);
    const proxiedSrc = useMemo(() => proxy(props.src ?? "", size, sha256), [props.src, size, sha256]);
    const [src, setSrc] = useState(proxiedSrc);

    useEffect(() => {
      setLoadFailed(false);
      setSrc(proxy(props.src, size, sha256));
    }, [props.src, size, sha256, proxy]);

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
              host: getUrlHostname(props.src),
            }}
          />
        </div>
      );
    }

    const handleImageError = e => {
      if (props.onError) {
        props.onError(e);
      } else {
        console.error("Failed to load image: ", props.src, e);
        if (bypass && src === proxiedSrc) {
          setSrc(props.src ?? "");
        } else {
          setLoadFailed(true);
        }
      }
    };

    if (!src || loadFailed) return missingImageElement ?? <div>Image not available</div>;

    return (
      <img {...props} ref={ref} src={src} width={size} height={size} className={className} onError={handleImageError} />
    );
  },
);
