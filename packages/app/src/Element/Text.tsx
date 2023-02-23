import "./Text.css";
import { useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { visit, SKIP } from "unist-util-visit";

import { UrlRegex, MentionRegex, InvoiceRegex, HashtagRegex } from "Const";
import { eventLink, hexToBech32, unwrap } from "Util";
import Invoice from "Element/Invoice";
import Hashtag from "Element/Hashtag";
import AddressLink from "Element/AddressLink";

import { Tag } from "@snort/nostr";
import { MetadataCache } from "State/Users";
import Mention from "Element/Mention";
import HyperText from "Element/HyperText";
import { HexKey } from "@snort/nostr";
import * as unist from "unist";

export type Fragment = string | React.ReactNode;

export interface TextFragment {
  body: React.ReactNode[];
  tags: Tag[];
  users: Map<string, MetadataCache>;
}

export interface TextProps {
  content: string;
  creator: HexKey;
  tags: Tag[];
  users: Map<string, MetadataCache>;
  longForm?: boolean;
}

export default function Text({ content, tags, creator, users, longForm = false }: TextProps) {
  function extractLinks(fragments: Fragment[]) {
    return fragments
      .map(f => {
        if (typeof f === "string") {
          return f.split(UrlRegex).map(a => {
            if (a.startsWith("http")) {
              return <HyperText key={a} link={a} creator={creator} />;
            }
            return a;
          });
        }
        return f;
      })
      .flat();
  }

  function extractMentions(frag: TextFragment) {
    return frag.body
      .map(f => {
        if (typeof f === "string") {
          return f.split(MentionRegex).map(match => {
            const matchTag = match.match(/#\[(\d+)\]/);
            if (matchTag && matchTag.length === 2) {
              const idx = parseInt(matchTag[1]);
              const ref = frag.tags?.find(a => a.Index === idx);
              if (ref) {
                switch (ref.Key) {
                  case "p": {
                    return <Mention pubkey={ref.PubKey ?? ""} />;
                  }
                  case "e": {
                    const eText = hexToBech32("note", ref.Event).substring(0, 12);
                    return (
                      <Link to={eventLink(ref.Event ?? "")} onClick={e => e.stopPropagation()}>
                        #{eText}
                      </Link>
                    );
                  }
                  case "a": {
                    return <AddressLink address={ref.Original[1]} />;
                  }
                  case "t": {
                    return <Hashtag tag={ref.Hashtag ?? ""} />;
                  }
                }
              }
              return <b style={{ color: "var(--error)" }}>{matchTag[0]}?</b>;
            } else {
              return match;
            }
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
              return <Invoice invoice={i} />;
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
              return <Hashtag tag={i.substring(1)} />;
            } else {
              return i;
            }
          });
        }
        return f;
      })
      .flat();
  }

  function transformLi(frag: TextFragment) {
    const fragments = transformText(frag);
    return <li>{fragments}</li>;
  }

  function transformParagraph(frag: TextFragment) {
    const fragments = transformText(frag);
    if (fragments.every(f => typeof f === "string")) {
      return <p>{fragments}</p>;
    }
    return <>{fragments}</>;
  }

  function transformText(frag: TextFragment) {
    let fragments = extractMentions(frag);
    fragments = extractLinks(fragments);
    fragments = extractInvoices(fragments);
    fragments = extractHashtags(fragments);
    return fragments;
  }

  const components = useMemo(() => {
    return {
      p: (x: { children?: React.ReactNode[] }) => transformParagraph({ body: x.children ?? [], tags, users }),
      a: (x: { href?: string }) => {
        const [content] = extractMentions({ body: [x.href], tags, users });
        return <HyperText link={content as string} creator={creator} />;
      },
      li: (x: { children?: Fragment[] }) => transformLi({ body: x.children ?? [], tags, users }),
    };
  }, [content]);

  interface Node extends unist.Node<unist.Data> {
    value: string;
  }

  const replaceMarkdownRefs = useCallback(
    () => (tree: Node) => {
      visit(tree, (node, index, parent) => {
        if (parent && typeof index === "number" && (node.type === "link" || node.type === "linkReference")) {
          // @ts-expect-error: Property 'url'
          node.url = extractMentions({ body: [node.url], tags, users }).at(0);
          return SKIP;
        }
      });
    },
    [content]
  );

  const disableMarkdownLinks = useCallback(
    () => (tree: Node) => {
      visit(tree, (node, index, parent) => {
        if (
          parent &&
          typeof index === "number" &&
          (node.type === "link" ||
            node.type === "linkReference" ||
            node.type === "image" ||
            node.type === "imageReference" ||
            node.type === "definition")
        ) {
          node.type = "text";
          const position = unwrap(node.position);
          node.value = content.slice(position.start.offset, position.end.offset).replace(/\)$/, " )");
          return SKIP;
        }
      });
    },
    [content]
  );
  return (
    <div dir="auto">
      <ReactMarkdown
        className="text"
        components={components}
        remarkPlugins={longForm ? [replaceMarkdownRefs, remarkGfm] : [disableMarkdownLinks]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
