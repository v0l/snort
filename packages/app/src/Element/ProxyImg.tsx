import useImgProxy from "Hooks/useImgProxy";
import { useEffect, useState } from "react";

interface ProxyImgProps extends React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement> {
  size?: number;
}

export const ProxyImg = (props: ProxyImgProps) => {
  const { src, size, ...rest } = props;
  const [url, setUrl] = useState<string>();
  const { proxy } = useImgProxy();

  useEffect(() => {
    if (src) {
      const url = proxy(src, size);
      setUrl(url);
    }
  }, [src]);

  return <img src={url} {...rest} />;
};
