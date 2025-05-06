import { Nip94Tags, readNip94Tags } from "./nip94";

/**
 * Read NIP-94 tags from `imeta` tag
 */
export function readNip94TagsFromIMeta(tag: Array<string>) {
  const asTags = tag.slice(1).map(a => a.split(" ", 2));
  return readNip94Tags(asTags);
}

export function nip94TagsToIMeta(meta: Nip94Tags) {
  if (!meta.url) {
    throw new Error("URL is required!");
  }
  const ret: Array<string> = ["imeta"];
  const ifPush = (key: string, value?: string | number) => {
    if (value) {
      ret.push(`${key} ${value}`);
    }
  };
  ifPush("url", meta.url);
  ifPush("m", meta.mimeType);
  ifPush("x", meta.hash);
  ifPush("ox", meta.originalHash);
  ifPush("size", meta.size);
  ifPush("dim", meta.dimensions?.join("x"));
  ifPush("magnet", meta.magnet);
  ifPush("blurhash", meta.blurHash);
  ifPush("thumb", meta.thumb);
  ifPush("summary", meta.summary);
  ifPush("alt", meta.alt);
  ifPush("duration", meta.duration);
  ifPush("bitrate", meta.bitrate);
  if (meta.image) {
    meta.image.forEach(a => ifPush("image", a));
  }
  if (meta.fallback) {
    meta.fallback.forEach(a => ifPush("fallback", a));
  }

  return ret;
}
