import useImgProxy from "@/Hooks/useImgProxy";
import React, { HTMLProps, ReactNode, useState } from "react";
import { FormattedMessage } from "react-intl";
import { getUrlHostname } from "@/SnortUtils";

type ProxyImgProps = HTMLProps<HTMLImageElement> & {
  size?: number;
  className?: string;
  promptToLoadDirectly?: boolean;
  missingImageElement?: ReactNode;
};

export const ProxyImg = ({ size, className, promptToLoadDirectly, missingImageElement, ...props }: ProxyImgProps) => {
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
  const src = bypass ? props.src : proxy(props.src ?? "", size);
  if (!src || (loadFailed && !bypass)) return missingImageElement;
  return (
    <img
      {...props}
      src={src}
      width={size}
      height={size}
      className={className}
      onError={e => {
        if (props.onError) {
          props.onError(e);
        } else {
          console.error("Failed to proxy image ", props.src);
          setLoadFailed(true);
        }
      }}
    />
  );
};
