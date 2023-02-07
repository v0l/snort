import "./Text.css";
import { useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { visit, SKIP } from "unist-util-visit";

import { UrlRegex, MentionRegex, InvoiceRegex, HashtagRegex } from "Const";
import { eventLink, hexToBech32 } from "Util";
import Invoice from "Element/Invoice";
import Hashtag from "Element/Hashtag";

import Tag from "Nostr/Tag";
import { MetadataCache } from "State/Users";
import Mention from "Element/Mention";
import HyperText from "Element/HyperText";
import { HexKey } from "Nostr";

export type Fragment = string | JSX.Element;

export interface TextFragment {
  body: Fragment[];
  tags: Tag[];
  users: Map<string, MetadataCache>;
}

export interface TextProps {
  content: string;
  creator: HexKey;
  tags: Tag[];
  users: Map<string, MetadataCache>;
}

export default function Text({ content, tags, creator, users }: TextProps) {
  function extractLinks(fragments: Fragment[]) {
    return fragments
      .map((f) => {
        if (typeof f === "string") {
          return f.split(UrlRegex).map((a) => {
            if (a.startsWith("http")) {
              return <HyperText link={a} creator={creator} />;
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
      .map((f) => {
        if (typeof f === "string") {
          return f.split(MentionRegex).map((match) => {
            let matchTag = match.match(/#\[(\d+)\]/);
            if (matchTag && matchTag.length === 2) {
              let idx = parseInt(matchTag[1]);
              let ref = frag.tags?.find((a) => a.Index === idx);
              if (ref) {
                switch (ref.Key) {
                  case "p": {
                    return <Mention pubkey={ref.PubKey!} />;
                  }
                  case "e": {
                    let eText = hexToBech32("note", ref.Event!).substring(
                      0,
                      12
                    );
                    return (
                      <Link
                        key={ref.Event}
                        to={eventLink(ref.Event!)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        #{eText}
                      </Link>
                    );
                  }
                  case "t": {
                    return <Hashtag tag={ref.Hashtag!} />;
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
      .map((f) => {
        if (typeof f === "string") {
          return f.split(InvoiceRegex).map((i) => {
            if (i.toLowerCase().startsWith("lnbc")) {
              return <Invoice key={i} invoice={i} />;
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
      .map((f) => {
        if (typeof f === "string") {
          return f.split(HashtagRegex).map((i) => {
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
    let fragments = transformText(frag);
    return <li>{fragments}</li>;
  }

  function transformParagraph(frag: TextFragment) {
    const fragments = transformText(frag);
    if (fragments.every((f) => typeof f === "string")) {
      return <p>{fragments}</p>;
    }
    return <>{fragments}</>;
  }

  function transformText(frag: TextFragment) {
    if (frag.body === undefined) {
      debugger;
    }
    let fragments = extractMentions(frag);
    fragments = extractLinks(fragments);
    fragments = extractInvoices(fragments);
    fragments = extractHashtags(fragments);
    return fragments;
  }

  const components = useMemo(() => {
    return {
      p: (x: any) =>
        transformParagraph({ body: x.children ?? [], tags, users }),
      a: (x: any) => <HyperText link={x.href} creator={creator} />,
      li: (x: any) => transformLi({ body: x.children ?? [], tags, users }),
    };
  }, [content]);

  const disableMarkdownLinks = useCallback(
    () => (tree: any) => {
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
          node.value = content
            .slice(node.position.start.offset, node.position.end.offset)
            .replace(/\)$/, " )");
          return SKIP;
        }
      });
    },
    [content]
  );
  return (
    <ReactMarkdown
      className="text"
      components={components}
      remarkPlugins={[disableMarkdownLinks]}
    >
      {content}
    </ReactMarkdown>
  );
}
