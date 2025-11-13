import { base64 } from "@scure/base";
import { hexToBytes } from "@noble/hashes/utils.js";
import { hmacSha256, unwrap } from "./utils";

export const DefaultImgProxy = {
  url: "https://imgproxy.v0l.io",
  key: "a82fcf26aa0ccb55dfc6b4bd6a1c90744d3be0f38429f21a8828b43449ce7cebe6bdc2b09a827311bef37b18ce35cb1e6b1c60387a254541afa9e5b4264ae942",
  salt: "a897770d9abf163de055e9617891214e75a9016d748f8ef865e6ffbcb9ed932295659549773a22a019a5f06d0b440c320be411e3fddfe784e199e4f03d74bd9b",
};

export interface ImgProxySettings {
  url: string;
  key: string;
  salt: string;
}

export function proxyImg(url: string, settings?: ImgProxySettings, resize?: number, sha256?: string) {
  const te = new TextEncoder();
  function urlSafe(s: string) {
    return s.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  }

  function signUrl(u: string) {
    const result = hmacSha256(hexToBytes(unwrap(settings).key), hexToBytes(unwrap(settings).salt), te.encode(u));
    return urlSafe(base64.encode(result));
  }
  if (!settings) return url;
  if (url.startsWith("data:") || url.startsWith("blob:") || url.length == 0) return url;
  const opts = [];
  if (sha256) {
    opts.push(`hs:sha256:${sha256}`);
  }
  if (resize) {
    opts.push(`rs:fit:${resize}:${resize}`);
    opts.push(`dpr:${window.devicePixelRatio}`);
  }
  const urlBytes = te.encode(url);
  const urlEncoded = urlSafe(base64.encode(urlBytes));
  const path = `/${opts.join("/")}/${urlEncoded}`;
  const sig = signUrl(path);
  return `${new URL(settings.url).toString()}${sig}${path}`;
}
