import useImgProxy from "Hooks/useImgProxy";
import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { getUrlHostname } from "SnortUtils";

interface ProxyImgProps extends React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement> {
  size?: number;
}

export const ProxyImg = (props: ProxyImgProps) => {
  const { src, size, ...rest } = props;
  const [url, setUrl] = useState<string>();
  const [loadFailed, setLoadFailed] = useState(false);
  const [bypass, setBypass] = useState(false);
  const { proxy } = useImgProxy();

  useEffect(() => {
    if (src) {
      const url = proxy(src, size);
      setUrl(url);
    }
  }, [src]);

  if (loadFailed) {
    if (bypass) {
      return <img src={src} {...rest} />;
    }
    return (
      <div
        className="note-invoice error"
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
  return <img src={url} {...rest} onError={() => setLoadFailed(true)} />;
};
