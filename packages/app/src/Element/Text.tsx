import "./Text.css";
import { useMemo, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { visit, SKIP } from "unist-util-visit";
import * as unist from "unist";
import { HexKey, NostrPrefix, Tag } from "@snort/nostr";

import { MentionRegex, InvoiceRegex, HashtagRegex, MagnetRegex } from "Const";
import { eventLink, hexToBech32, magnetURIDecode, splitByUrl, unwrap } from "Util";
import Invoice from "Element/Invoice";
import Hashtag from "Element/Hashtag";
import Mention from "Element/Mention";
import HyperText from "Element/HyperText";
import MagnetLink from "Element/MagnetLink";

export type Fragment = string | React.ReactNode;

export interface TextFragment {
  body: React.ReactNode[];
  tags: Tag[];
}

export interface TextProps {
  content: string;
  creator: HexKey;
  tags: Tag[];
}

export default function Text({ content, tags, creator }: TextProps) {
  const location = useLocation();

  function extractLinks(fragments: Fragment[]) {
    return fragments
      .map(f => {
        if (typeof f === "string") {
          return splitByUrl(f).map(a => {
            if (a.match(/^(?:https?|(?:web\+)?nostr):/i)) {
              return <HyperText key={a} link={a} creator={creator} />;
            }
            return a;
          });
        }
        return f;
      })
      .flat();
  }

  function extractMagnetLinks(fragments: Fragment[]) {
    return fragments
      .map(f => {
        if (typeof f === "string") {
          return f.split(MagnetRegex).map(a => {
            if (a.startsWith("magnet:")) {
              const parsed = magnetURIDecode(a);
              if (parsed) {
                return <MagnetLink magnet={parsed} />;
              }
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
                    return <Mention pubkey={ref.PubKey ?? ""} relays={ref.Relay} />;
                  }
                  case "e": {
                    const eText = hexToBech32(NostrPrefix.Event, ref.Event).substring(0, 12);
                    return ref.Event ? (
                      <Link
                        to={eventLink(ref.Event, ref.Relay)}
                        onClick={e => e.stopPropagation()}
                        state={{ from: location.pathname }}>
                        #{eText}
                      </Link>
                    ) : (
                      ""
                    );
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
    fragments = extractMagnetLinks(fragments);
    return fragments;
  }

  const components = useMemo(() => {
    return {
      p: (x: { children?: React.ReactNode[] }) => transformParagraph({ body: x.children ?? [], tags }),
      a: (x: { href?: string }) => <HyperText link={x.href ?? ""} creator={creator} />,
      li: (x: { children?: Fragment[] }) => transformLi({ body: x.children ?? [], tags }),
    };
  }, [content]);

  interface Node extends unist.Node<unist.Data> {
    value: string;
  }

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
      <ReactMarkdown className="text" components={components} remarkPlugins={[disableMarkdownLinks]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
