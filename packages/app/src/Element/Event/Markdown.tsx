import "./Markdown.css";

import { ReactNode, forwardRef, useMemo } from "react";
import { transformText } from "@snort/system";
import { marked, Token } from "marked";
import { Link } from "react-router-dom";
import markedFootnote, { Footnotes, Footnote, FootnoteRef } from "marked-footnote";

import { ProxyImg } from "@/Element/ProxyImg";
import NostrLink from "@/Element/Embed/NostrLink";

interface MarkdownProps {
  content: string;
  tags?: Array<Array<string>>;
}

function renderToken(t: Token | Footnotes | Footnote | FootnoteRef, tags: Array<Array<string>>): ReactNode {
  try {
    switch (t.type) {
      case "paragraph": {
        return <p>{t.tokens ? t.tokens.map(a => renderToken(a, tags)) : t.raw}</p>;
      }
      case "image": {
        return <ProxyImg src={t.href} />;
      }
      case "heading": {
        switch (t.depth) {
          case 1:
            return <h1>{t.tokens ? t.tokens.map(a => renderToken(a, tags)) : t.raw}</h1>;
          case 2:
            return <h2>{t.tokens ? t.tokens.map(a => renderToken(a, tags)) : t.raw}</h2>;
          case 3:
            return <h3>{t.tokens ? t.tokens.map(a => renderToken(a, tags)) : t.raw}</h3>;
          case 4:
            return <h4>{t.tokens ? t.tokens.map(a => renderToken(a, tags)) : t.raw}</h4>;
          case 5:
            return <h5>{t.tokens ? t.tokens.map(a => renderToken(a, tags)) : t.raw}</h5>;
          case 6:
            return <h6>{t.tokens ? t.tokens.map(a => renderToken(a, tags)) : t.raw}</h6>;
        }
        throw new Error("Invalid heading");
      }
      case "codespan": {
        return <code>{t.raw}</code>;
      }
      case "code": {
        return <pre>{t.raw}</pre>;
      }
      case "br": {
        return <br />;
      }
      case "hr": {
        return <hr />;
      }
      case "blockquote": {
        return <blockquote>{t.tokens ? t.tokens.map(a => renderToken(a, tags)) : t.raw}</blockquote>;
      }
      case "link": {
        return (
          <Link to={t.href as string} className="ext" target="_blank">
            {t.tokens ? t.tokens.map(a => renderToken(a, tags)) : t.raw}
          </Link>
        );
      }
      case "list": {
        if (t.ordered) {
          return <ol>{(t.items as Token[]).map(a => renderToken(a, tags))}</ol>;
        } else {
          return <ul>{(t.items as Token[]).map(a => renderToken(a, tags))}</ul>;
        }
      }
      case "list_item": {
        return <li>{t.tokens ? t.tokens.map(a => renderToken(a, tags)) : t.raw}</li>;
      }
      case "em": {
        return <em>{t.tokens ? t.tokens.map(a => renderToken(a, tags)) : t.raw}</em>;
      }
      case "del": {
        return <s>{t.tokens ? t.tokens.map(a => renderToken(a, tags)) : t.raw}</s>;
      }
      case "footnoteRef": {
        return (
          <sup>
            <Link to={`#fn-${t.label}`} className="super">
              [{t.label}]
            </Link>
          </sup>
        );
      }
      case "footnotes":
      case "footnote": {
        return;
      }
      default: {
        if ("tokens" in t) {
          return (t.tokens as Array<Token>).map(a => renderToken(a, tags));
        }
        return transformText(t.raw, tags).map(v => {
          switch (v.type) {
            case "link": {
              if (v.content.startsWith("nostr:")) {
                return <NostrLink link={v.content} />;
              } else {
                return v.content;
              }
            }
            case "mention": {
              return <NostrLink link={v.content} />;
            }
            default: {
              return v.content;
            }
          }
        });
      }
    }
  } catch (e) {
    console.error(e);
  }
}

export const Markdown = forwardRef<HTMLDivElement, MarkdownProps>((props: MarkdownProps, ref) => {
  const parsed = useMemo(() => {
    return marked.use(markedFootnote()).lexer(props.content);
  }, [props.content, props.tags]);

  return (
    <div className="markdown" ref={ref}>
      {parsed.filter(a => a.type !== "footnote" && a.type !== "footnotes").map(a => renderToken(a, props.tags ?? []))}
    </div>
  );
});
Markdown.displayName = "Markdown";
