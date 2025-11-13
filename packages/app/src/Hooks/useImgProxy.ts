import usePreferences from "@/Hooks/usePreferences";
import { proxyImg } from "@snort/shared";

export default function useImgProxy() {
  const imgProxyConfig = usePreferences(s => s.imgProxyConfig);

  return {
    proxy: (url: string, resize?: number, sha256?: string) => proxyImg(url, imgProxyConfig, resize, sha256),
  };
}
