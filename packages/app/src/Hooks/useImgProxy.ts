import * as secp from "@noble/secp256k1";
import * as base64 from "@protobufjs/base64";
import { useSelector } from "react-redux";
import { RootState } from "State/Store";
import { hmacSha256, unwrap } from "Util";

export interface ImgProxySettings {
  url: string;
  key: string;
  salt: string;
}

export default function useImgProxy() {
  const settings = useSelector((s: RootState) => s.login.preferences.imgProxyConfig);
  const te = new TextEncoder();

  function urlSafe(s: string) {
    return s.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  }

  async function signUrl(u: string) {
    const result = await hmacSha256(
      secp.utils.hexToBytes(unwrap(settings).key),
      secp.utils.hexToBytes(unwrap(settings).salt),
      te.encode(u)
    );
    return urlSafe(base64.encode(result, 0, result.byteLength));
  }

  return {
    proxy: async (url: string, resize?: number) => {
      if (!settings) return url;
      const opt = resize ? `rs:fit:${resize}:${resize}/dpr:${window.devicePixelRatio}` : "";
      const urlBytes = te.encode(url);
      const urlEncoded = urlSafe(base64.encode(urlBytes, 0, urlBytes.byteLength));
      const path = `/${opt}/${urlEncoded}`;
      const sig = await signUrl(path);
      return `${new URL(settings.url).toString()}${sig}${path}`;
    },
  };
}
