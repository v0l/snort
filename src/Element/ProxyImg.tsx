import useImgProxy from "Feed/ImgProxy";
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
      proxy(src, size)
        .then(a => setUrl(a))
        .catch(console.warn);
    }
  }, [src]);

  return <img src={url} {...rest} />;
};
