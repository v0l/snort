import * as utils from "@noble/curves/abstract/utils";
import { base64 } from "@scure/base";
import { hmacSha256, unwrap } from "SnortUtils";
import useLogin from "Hooks/useLogin";

export interface ImgProxySettings {
  url: string;
  key: string;
  salt: string;
}

export default function useImgProxy() {
  const settings = useLogin().preferences.imgProxyConfig;
  const te = new TextEncoder();

  function urlSafe(s: string) {
    return s.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  }

  function signUrl(u: string) {
    const result = hmacSha256(
      utils.hexToBytes(unwrap(settings).key),
      utils.hexToBytes(unwrap(settings).salt),
      te.encode(u)
    );
    return urlSafe(base64.encode(result));
  }

  return {
    proxy: (url: string, resize?: number) => {
      if (!settings) return url;
      if (url.startsWith("data:") || url.startsWith("blob:")) return url;
      const opt = resize ? `rs:fit:${resize}:${resize}/dpr:${window.devicePixelRatio}` : "";
      const urlBytes = te.encode(url);
      const urlEncoded = urlSafe(base64.encode(urlBytes));
      const path = `/${opt}/${urlEncoded}`;
      const sig = signUrl(path);
      return `${new URL(settings.url).toString()}${sig}${path}`;
    },
  };
}
