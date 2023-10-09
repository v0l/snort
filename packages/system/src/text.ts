import { unwrap } from "@snort/shared";

import {
  CashuRegex,
  FileExtensionRegex,
  HashtagRegex,
  InvoiceRegex,
  MarkdownCodeRegex,
  MentionNostrEntityRegex,
} from "./const";
import { validateNostrLink } from "./nostr-link";
import { splitByUrl } from "./utils";

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
                switch (extension[1]) {
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
              return {
                type: "media",
                content: a,
                mimeType: `${mediaType}/${extension[1]}`,
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
          if (i.toLowerCase().startsWith("#")) {
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

export function transformText(body: string, tags: Array<Array<string>>) {
  let fragments = extractLinks([body]);
  fragments = extractMentions(fragments);
  fragments = extractHashtags(fragments);
  fragments = extractInvoices(fragments);
  fragments = extractCashuTokens(fragments);
  fragments = extractCustomEmoji(fragments, tags);
  fragments = extractMarkdownCode(fragments);
  fragments = fragments
    .map(a => {
      if (typeof a === "string") {
        if (a.length > 0) {
          return { type: "text", content: a } as ParsedFragment;
        }
      } else {
        return a;
      }
    })
    .filter(a => a)
    .map(a => unwrap(a));
  return fragments as Array<ParsedFragment>;
}
