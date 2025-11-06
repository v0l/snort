import { forwardRef, HTMLProps, memo, ReactNode, useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";

import Icon from "@/Components/Icons/Icon";
import useImgProxy from "@/Hooks/useImgProxy";
import { getUrlHostname } from "@/Utils";

export type ProxyImgProps = HTMLProps<HTMLImageElement> & {
  size?: number;
  sha256?: string;
  className?: string;
  promptToLoadDirectly?: boolean;
  missingImageElement?: ReactNode;
  bypassProxy?: boolean;
};

const defaultMissingImageElement = <Icon name="x" className="text-warning" />;

const ProxyImgComponent = forwardRef<HTMLImageElement, ProxyImgProps>(function ProxyImg(
  { src, size, className, promptToLoadDirectly, missingImageElement, sha256, bypassProxy, ...props }: ProxyImgProps,
  ref,
) {
  const { proxy } = useImgProxy();
  const [loadFailed, setLoadFailed] = useState(false);
  const [bypass, setBypass] = useState(CONFIG.media.bypassImgProxyError);
  const [imgSrc, setImgSrc] = useState<string | undefined>(src ? proxy(src, size, sha256) : undefined);

  useEffect(() => {
    setLoadFailed(false);
    if (src) {
      setImgSrc(proxy(src, size, sha256));
    }
  }, [src, size, sha256]);

  if (loadFailed && !bypass && (promptToLoadDirectly ?? true)) {
    return (
      <div
        className="text-error"
        title={src}
        onClick={e => {
          e.stopPropagation();
          setBypass(true);
        }}>
        <FormattedMessage
          defaultMessage="Failed to proxy image from {host}, click here to load directly"
          values={{
            host: getUrlHostname(src),
          }}
        />
      </div>
    );
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
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

  if (!imgSrc || loadFailed) {
    return missingImageElement ?? defaultMissingImageElement;
  }

  return (
    <img
      {...props}
      ref={ref}
      src={(bypassProxy ?? false) ? src : imgSrc}
      width={size}
      height={size}
      className={className}
      onError={handleImageError}
      crossOrigin={props.crossOrigin}
    />
  );
});

const ProxyImg = memo(ProxyImgComponent);
ProxyImg.displayName = "ProxyImg";

export { ProxyImg };
