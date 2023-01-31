import useImgProxy from "Feed/ImgProxy";
import { useEffect, useState } from "react";

export const ProxyImg = (props: any) => {
    const { src, ...rest } = props;
    const [url, setUrl] = useState<string>();
    const { proxy } = useImgProxy();

    useEffect(() => {
        if (src) {
            proxy(src)
                .then(a => setUrl(a))
                .catch(console.warn);
        }
    }, [src]);

    return <img src={url} {...rest} />
}