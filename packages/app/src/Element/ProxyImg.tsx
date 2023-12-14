import useImgProxy from "@/Hooks/useImgProxy";
import React, { HTMLProps, ReactNode, forwardRef, useState } from "react";
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
    const [bypass, setBypass] = useState(CONFIG.bypassImgProxyError);

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
    const src = loadFailed && bypass ? props.src : proxy(props.src ?? "", size, sha256);
    if (!src || (loadFailed && !bypass)) return missingImageElement;
    return (
      <img
        {...props}
        ref={ref}
        src={src}
        width={size}
        height={size}
        className={className}
        onError={e => {
          if (props.onError) {
            props.onError(e);
          } else {
            console.error("Failed to proxy image: ", props.src, e);
            setLoadFailed(true);
          }
        }}
      />
    );
  },
);
