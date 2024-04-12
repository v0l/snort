import { removeUndefined } from "@snort/shared";

import {
  CashuRegex,
  FileExtensionRegex,
  HashtagRegex,
  InvoiceRegex,
  MarkdownCodeRegex,
  MentionNostrEntityRegex,
  TagRefRegex,
} from "./const";
import { NostrLink, validateNostrLink } from "./nostr-link";
import { splitByUrl } from "./utils";
import { IMeta } from "./nostr";

export interface ParsedFragment {
  type:
    | "text"
    | "link"
    | "mention"
    | "invoice"
    | "media"
    | "cashu"
    | "hashtag"
    | "custom_emoji"
    | "highlighted_text"
    | "code_block";
  content: string;
  mimeType?: string;
  language?: string;
  data?: object;
}

export type Fragment = string | ParsedFragment;

function extractLinks(fragments: Fragment[]) {
  return fragments
    .map(f => {
      if (typeof f === "string") {
        return splitByUrl(f).map(a => {
          const validateLink = () => {
            const normalizedStr = a.toLowerCase();

            if (normalizedStr.startsWith("web+nostr:") || normalizedStr.startsWith("nostr:")) {
              return validateNostrLink(normalizedStr);
            }

            return (
              normalizedStr.startsWith("http:") ||
              normalizedStr.startsWith("https:") ||
              normalizedStr.startsWith("magnet:")
            );
          };

          if (validateLink()) {
            const url = new URL(a);
            const extension = url.pathname.match(FileExtensionRegex);

            if (extension && extension.length > 1) {
              const mediaType = (() => {
                switch (extension[1].toLowerCase()) {
                  case "gif":
                  case "jpg":
                  case "jpeg":
                  case "jfif":
                  case "png":
                  case "bmp":
                  case "webp":
                    return "image";
                  case "wav":
                  case "mp3":
                  case "ogg":
                    return "audio";
                  case "mp4":
                  case "mov":
                  case "mkv":
                  case "avi":
                  case "m4v":
                  case "webm":
                  case "m3u8":
                    return "video";
                  default:
                    return "unknown";
                }
              })();
              const data = parseInlineMetaHack(url);
              return {
                type: "media",
                content: data ? `${url.protocol}//${url.host}${url.pathname}${url.search}` : a,
                mimeType: `${mediaType}/${extension[1]}`,
                data,
              } as ParsedFragment;
            } else {
              return {
                type: "link",
                content: a,
              } as ParsedFragment;
            }
          }
          return a;
        });
      }
      return f;
    })
    .flat();
}

function extractMentions(fragments: Fragment[]) {
  return fragments
    .map(f => {
      if (typeof f === "string") {
        return f.split(MentionNostrEntityRegex).map(i => {
          if (MentionNostrEntityRegex.test(i)) {
            return {
              type: "mention",
              content: i,
            } as ParsedFragment;
          } else {
            return i;
          }
        });
      }
      return f;
    })
    .flat();
}

function extractCashuTokens(fragments: Fragment[]) {
  return fragments
    .map(f => {
      if (typeof f === "string" && f.includes("cashuA")) {
        return f.split(CashuRegex).map(a => {
          return {
            type: "cashu",
            content: a,
          } as ParsedFragment;
        });
      }
      return f;
    })
    .flat();
}

function extractInvoices(fragments: Fragment[]) {
  return fragments
    .map(f => {
      if (typeof f === "string") {
        return f.split(InvoiceRegex).map(i => {
          if (i.toLowerCase().startsWith("lnbc")) {
            return {
              type: "invoice",
              content: i,
            } as ParsedFragment;
          } else {
            return i;
          }
        });
      }
      return f;
    })
    .flat();
}

function extractHashtags(fragments: Fragment[]) {
  return fragments
    .map(f => {
      if (typeof f === "string") {
        return f.split(HashtagRegex).map(i => {
          if (i.match(HashtagRegex)) {
            return {
              type: "hashtag",
              content: i.substring(1),
            } as ParsedFragment;
          } else {
            return i;
          }
        });
      }
      return f;
    })
    .flat();
}

function extractTagRefs(fragments: Fragment[], tags: Array<Array<string>>) {
  return fragments
    .map(f => {
      if (typeof f === "string") {
        return f.split(TagRefRegex).map(i => {
          if (i.startsWith("#")) {
            const tag = tags[Number(i.slice(2, -1))];
            if (tag) {
              try {
                return {
                  type: "mention",
                  content: `nostr:${NostrLink.fromTag(tag).encode()}`,
                } as ParsedFragment;
              } catch (e) {
                // ignore
              }
            }
          }
          return i;
        });
      }
      return f;
    })
    .flat();
}

function extractCustomEmoji(fragments: Fragment[], tags: Array<Array<string>>) {
  return fragments
    .map(f => {
      if (typeof f === "string") {
        return f.split(/:(\w+):/g).map(i => {
          const t = tags.find(a => a[0] === "emoji" && a[1] === i);
          if (t) {
            return {
              type: "custom_emoji",
              content: t[2],
            } as ParsedFragment;
          } else {
            return i;
          }
        });
      }
      return f;
    })
    .flat();
}

function extractMarkdownCode(fragments: Fragment[]): (string | ParsedFragment)[] {
  return fragments
    .map(f => {
      if (typeof f === "string") {
        return f.split(MarkdownCodeRegex).map(i => {
          if (i.startsWith("```") && i.endsWith("```")) {
            const firstLineBreakIndex = i.indexOf("\n");
            const lastLineBreakIndex = i.lastIndexOf("\n");

            return {
              type: "code_block",
              content: i.substring(firstLineBreakIndex, lastLineBreakIndex),
              language: i.substring(3, firstLineBreakIndex),
            } as ParsedFragment;
          } else {
            return i;
          }
        });
      }

      return f;
    })
    .flat();
}

export function parseIMeta(tags: Array<Array<string>>) {
  let ret: Record<string, IMeta> | undefined;
  const imetaTags = tags.filter(a => a[0] === "imeta");
  for (const imetaTag of imetaTags) {
    ret ??= {};
    let imeta: IMeta = {};
    let url = "";
    for (const t of imetaTag.slice(1)) {
      const [k, v] = t.split(" ");
      if (k === "url") {
        url = v;
      }
      if (k === "dim") {
        const [w, h] = v.split("x");
        imeta.height = Number(h);
        imeta.width = Number(w);
      }
      if (k === "blurhash") {
        imeta.blurHash = v;
      }
      if (k === "x") {
        imeta.sha256 = v;
      }
      if (k === "alt") {
        imeta.alt = v;
      }
    }
    ret[url] = imeta;
  }
  return ret;
}

export function parseInlineMetaHack(u: URL) {
  if (u.hash) {
    const params = new URLSearchParams(u.hash.substring(1));

    let imeta: IMeta = {};
    const dim = params.get("dim");
    if (dim) {
      const [w, h] = dim.split("x");
      imeta.height = Number(h);
      imeta.width = Number(w);
    }
    imeta.blurHash = params.get("blurhash") ?? undefined;
    imeta.sha256 = params.get("x") ?? undefined;
    imeta.alt = params.get("alt") ?? undefined;

    return imeta;
  }
}

export function transformText(body: string, tags: Array<Array<string>>) {
  let fragments = extractLinks([body]);
  fragments = extractMentions(fragments);
  fragments = extractTagRefs(fragments, tags);
  fragments = extractHashtags(fragments);
  fragments = extractInvoices(fragments);
  fragments = extractCashuTokens(fragments);
  fragments = extractCustomEmoji(fragments, tags);
  fragments = extractMarkdownCode(fragments);
  const frags = removeUndefined(
    fragments.map(a => {
      if (typeof a === "string") {
        if (a.length > 0) {
          return { type: "text", content: a } as ParsedFragment;
        }
      } else {
        return a;
      }
    }),
  );

  const imeta = parseIMeta(tags);
  if (imeta) {
    for (const f of frags) {
      if (f.type === "media") {
        const ix = imeta[f.content];
        if (ix) {
          f.data = ix;
        }
      }
    }
  }
  if (frags.some(a => a.type === "hashtag")) {
    console.debug(frags);
  }
  return frags;
}
