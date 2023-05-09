import "./Text.css";
import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { visit, SKIP } from "unist-util-visit";
import * as unist from "unist";
import { HexKey, NostrPrefix } from "@snort/nostr";

import { MentionRegex, InvoiceRegex, HashtagRegex, CashuRegex } from "Const";
import { eventLink, hexToBech32, splitByUrl, unwrap, validateNostrLink } from "Util";
import Invoice from "Element/Invoice";
import Hashtag from "Element/Hashtag";
import Mention from "Element/Mention";
import HyperText from "Element/HyperText";
import CashuNuts from "Element/CashuNuts";

export type Fragment = string | React.ReactNode;

export interface TextFragment {
  body: React.ReactNode[];
  tags: Array<Array<string>>;
}

export interface TextProps {
  content: string;
  creator: HexKey;
  tags: Array<Array<string>>;
  disableMedia?: boolean;
  depth?: number;
}

export default function Text({ content, tags, creator, disableMedia, depth }: TextProps) {
  const location = useLocation();

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
              if (disableMedia ?? false) {
                return (
                  <a href={a} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" className="ext">
                    {a}
                  </a>
                );
              }
              return <HyperText link={a} creator={creator} depth={depth} />;
            }
            return a;
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
            return <CashuNuts token={a} />;
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
              const ref = frag.tags?.[idx];
              if (ref) {
                switch (ref[0]) {
                  case "p": {
                    return <Mention pubkey={ref[1] ?? ""} relays={ref[2]} />;
                  }
                  case "e": {
                    const eText = hexToBech32(NostrPrefix.Event, ref[1]).substring(0, 12);
                    return (
                      ref[1] && (
                        <Link
                          to={eventLink(ref[1], ref[2])}
                          onClick={e => e.stopPropagation()}
                          state={{ from: location.pathname }}>
                          #{eText}
                        </Link>
                      )
                    );
                  }
                  case "t": {
                    return <Hashtag tag={ref[1] ?? ""} />;
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
    fragments = extractCashuTokens(fragments);
    return fragments;
  }

  const components = {
    p: (x: { children?: React.ReactNode[] }) => transformParagraph({ body: x.children ?? [], tags }),
    a: (x: { href?: string }) => <HyperText link={x.href ?? ""} creator={creator} />,
    li: (x: { children?: Fragment[] }) => transformLi({ body: x.children ?? [], tags }),
  };

  interface Node extends unist.Node<unist.Data> {
    value: string;
  }

  const disableMarkdownLinks = () => (tree: Node) => {
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
  };

  const element = useMemo(() => {
    return (
      <ReactMarkdown className="text" components={components} remarkPlugins={[disableMarkdownLinks]}>
        {content}
      </ReactMarkdown>
    );
  }, [content]);

  return <div dir="auto">{element}</div>;
}
