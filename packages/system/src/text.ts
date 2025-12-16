import { removeUndefined } from "@snort/shared";

import {
  CashuRegex,
  FileExtensionRegex,
  HashtagRegex,
  InlineCodeRegex,
  InvoiceRegex,
  MarkdownCodeRegex,
  MentionNostrEntityRegex,
  TagRefRegex,
} from "./const";
import { NostrLink, tryParseNostrLink } from "./nostr-link";
import { extensionToMime, UrlRegex } from "./utils";
import { type Nip94Tags, readNip94TagsFromIMeta } from ".";

export enum FragmentType {
  /**
   * Plain test fragment
   */
  Text = "text",
  /**
   * Link to external site
   */
  Link = "link",
  /**
   * @ mention of a nostr entity
   */
  Mention = "mention",
  /**
   * Lightning invoice
   */
  Invoice = "invoice",
  /**
   * Image or Video link (http/https)
   */
  Media = "media",
  /**
   * Cashu token
   */
  Cashu = "cashu",
  /**
   * Hashtag topic link
   */
  Hashtag = "hashtag",
  /**
   * Custom emoji link
   */
  CustomEmoji = "custom_emoji",
  /**
   * Highlighted text (handled externally)
   */
  HighlightedText = "highlighted_text",
  /**
   * Code block (```)
   */
  CodeBlock = "code_block",
  /**
   * Inline code (`)
   */
  InlineCode = "inline_code",
  /**
   * Blossom url
   */
  BlossomBlob = "blossom",
  /**
   * Magnet torrent link
   */
  MagnetLink = "magnet",
}

export interface ParsedFragment {
  type: FragmentType;
  /**
   * The raw fragment content string
   */
  content: string;
  /**
   * Media mime type for "media" fragments
   */
  mimeType?: string;
  /**
   * Code language or spoken language
   */
  language?: string;
  /**
   * Opaque object based on the fragment type
   */
  data?: object;
}

export type Fragment = string | ParsedFragment;

/**
 * Process fragments by applying a function to string fragments only.
 *
 * @param fragments - Array of fragments to process
 * @param fn - Function to apply to each string fragment
 * @param filterEmpty - Whether to filter out empty string fragments
 * @returns Processed and flattened array of fragments
 */
function mapFragments(
  fragments: Fragment[],
  fn: (str: string) => Fragment | Fragment[],
  filterEmpty = true,
): Fragment[] {
  const result = fragments
    .flatMap(f => {
      if (typeof f === "string") {
        return fn(f);
      }
      return f;
    });

  if (filterEmpty) {
    return result.filter(f => typeof f !== "string" || f.length > 0);
  }

  return result;
}

/**
 * Efficiently split a string by a regex pattern and create parsed fragments for matches,
 * without needing to test the regex multiple times.
 *
 * @param str - The string to parse
 * @param regex - The regex pattern to match (must have the 'g' flag)
 * @param type - The FragmentType to assign to matched parts
 * @param transform - Optional function to transform the matched content. Return undefined to treat match as text.
 * @returns Array of strings (non-matches) and ParsedFragments (matches)
 */
function splitAndParseRegex(
  str: string,
  regex: RegExp,
  type: FragmentType,
  transform?: (match: string) => Partial<ParsedFragment> | undefined,
): Array<Fragment> {
  const result = [];
  let lastIndex = 0;

  // Reset regex before using matchAll
  regex.lastIndex = 0;

  for (const match of str.matchAll(regex)) {
    // Add text before match (if non-empty)
    if (match.index! > lastIndex) {
      result.push(str.substring(lastIndex, match.index));
    }

    if (transform) {
      const transformed = transform(match[0]);

      // If transform returns undefined, treat the match as text
      if (transformed === undefined) {
        result.push(match[0]);
      } else {
        // Create parsed fragment with transformed data
        const fragment: ParsedFragment = {
          type,
          content: match[0],
          ...transformed,
        };
        result.push(fragment);
      }
    } else {
      // No transform, create basic parsed fragment
      const fragment: ParsedFragment = {
        type,
        content: match[0],
      };
      result.push(fragment);
    }

    lastIndex = match.index! + match[0].length;
  }

  // Add remaining text after last match (if non-empty)
  if (lastIndex < str.length) {
    result.push(str.substring(lastIndex));
  }

  return result;
}

function extractLinks(fragments: Fragment[]) {
  return mapFragments(fragments, f =>
    splitAndParseRegex(f, UrlRegex, FragmentType.Link, a => {
      // check for regular http media link
      const normalizedStr = a.toLowerCase();
      if (normalizedStr.startsWith("http:") || normalizedStr.startsWith("https:")) {
        const url = new URL(a);
        const extension = url.pathname.match(FileExtensionRegex);

        if (extension && extension.length > 1) {
          // media links have special type
          const mediaType = extensionToMime(extension[1]);
          return {
            type: "media",
            content: a,
            mimeType: mediaType ?? `unknown/${extension[1]}`,
          } as ParsedFragment;
        }
      }
      if (
        normalizedStr.startsWith("nostr:") ||
        (normalizedStr.startsWith("web+nostr:") && tryParseNostrLink(normalizedStr))
      ) {
        // nostr links
        return {
          type: "mention",
          content: a,
        } as ParsedFragment;
      }
      if (normalizedStr.startsWith("magnet:")) {
        // magnet links
        return {
          type: "magnet",
          content: a,
        } as ParsedFragment;
      }
      if (normalizedStr.startsWith("blossom:")) {
        // magnet links
        return {
          type: "blossom",
          content: a,
        } as ParsedFragment;
      }

      // generic link
      return {
        type: "link",
        content: a,
      } as ParsedFragment;
    }),
  );
}

function extractMentions(fragments: Fragment[]) {
  return mapFragments(fragments, f => splitAndParseRegex(f, MentionNostrEntityRegex, FragmentType.Mention));
}

function extractCashuTokens(fragments: Fragment[]) {
  return mapFragments(fragments, f => {
    if (f.includes("cashuA")) {
      return splitAndParseRegex(f, CashuRegex, FragmentType.Cashu);
    }
    return f;
  });
}

function extractInvoices(fragments: Fragment[]) {
  return mapFragments(fragments, f => splitAndParseRegex(f, InvoiceRegex, FragmentType.Invoice));
}

function extractHashtags(fragments: Fragment[]) {
  return mapFragments(fragments, f =>
    splitAndParseRegex(f, HashtagRegex, FragmentType.Hashtag, match => ({
      content: match.substring(1), // Remove the # prefix
    })),
  );
}

function extractTagRefs(fragments: Fragment[], tags: Array<Array<string>>) {
  return mapFragments(fragments, f =>
    splitAndParseRegex(f, TagRefRegex, FragmentType.Mention, match => {
      // Extract tag index from #[0] pattern
      const tagIndex = Number(match.slice(2, -1));
      const tag = tags[tagIndex];

      if (tag) {
        try {
          return {
            content: `nostr:${NostrLink.fromTag(tag).encode()}`,
          };
        } catch (e) {
          // If NostrLink.fromTag fails, treat as text
          return undefined;
        }
      }

      // No tag found, treat as text
      return undefined;
    }),
  );
}

function extractCustomEmoji(fragments: Fragment[], tags: Array<Array<string>>) {
  const emojiRegex = /:(\w+):/g;

  return mapFragments(fragments, f =>
    splitAndParseRegex(f, emojiRegex, FragmentType.CustomEmoji, match => {
      // Extract emoji name from :name: pattern
      const emojiName = match.slice(1, -1);
      const tag = tags.find(a => a[0] === "emoji" && a[1] === emojiName);

      if (tag) {
        return { content: tag[2] }; // URL of the emoji
      }

      // Return undefined to treat as text if emoji not found
      return undefined;
    }),
  );
}

function extractMarkdownCode(fragments: Fragment[]): (string | ParsedFragment)[] {
  return mapFragments(fragments, f =>
    splitAndParseRegex(f, MarkdownCodeRegex, FragmentType.CodeBlock, match => {
      const cleaned = match.slice(3, match.length - 3);
      const isMultiLine = cleaned.includes("\n");
      const language = isMultiLine ? cleaned.slice(0, cleaned.indexOf("\n")).trim() : undefined;
      const content = isMultiLine ? cleaned.slice(cleaned.indexOf("\n") + 1) : cleaned;
      return {
        content,
        language,
      };
    }),
  );
}

function extractInlineCode(fragments: Fragment[]): (string | ParsedFragment)[] {
  return mapFragments(fragments, f =>
    splitAndParseRegex(f, InlineCodeRegex, FragmentType.InlineCode, match => ({
      content: match.slice(1, match.length - 1), // Remove backticks
    })),
  );
}

export function parseIMeta(tags: Array<Array<string>>) {
  let ret: Record<string, Nip94Tags> | undefined;
  const imetaTags = tags.filter(a => a[0] === "imeta");
  for (const imetaTag of imetaTags) {
    const meta = readNip94TagsFromIMeta(imetaTag);
    if (meta.url) {
      ret ??= {};
      ret[meta.url] = meta;
    }
  }
  return ret;
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
  fragments = extractInlineCode(fragments);
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

  // attach imeta data
  const imeta = parseIMeta(tags);
  if (imeta) {
    for (const f of frags) {
      const ix = imeta[f.content];
      if (ix) {
        f.data = ix;
        f.mimeType = ix.mimeType ?? f.mimeType;
      }
    }
  }
  return frags;
}
