import "./Text.css";
import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { HexKey, NostrPrefix, validateNostrLink } from "@snort/system";

import { MentionRegex, InvoiceRegex, HashtagRegex, CashuRegex } from "Const";
import { eventLink, hexToBech32, splitByUrl } from "SnortUtils";
import Invoice from "Element/Invoice";
import Hashtag from "Element/Hashtag";
import Mention from "Element/Mention";
import HyperText from "Element/HyperText";
import CashuNuts from "Element/CashuNuts";
import { ProxyImg } from "Element/ProxyImg";

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
  disableMediaSpotlight?: boolean;
  depth?: number;
}

export default function Text({ content, tags, creator, disableMedia, depth, disableMediaSpotlight }: TextProps) {
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
              if ((disableMedia ?? false) && !a.startsWith("nostr:")) {
                return (
                  <a href={a} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" className="ext">
                    {a}
                  </a>
                );
              }
              return (
                <HyperText link={a} creator={creator} depth={depth} disableMediaSpotlight={disableMediaSpotlight} />
              );
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

  function extractCustomEmoji(fragments: Fragment[]) {
    return fragments
      .map(f => {
        if (typeof f === "string") {
          return f.split(/:(\w+):/g).map(i => {
            const t = tags.find(a => a[0] === "emoji" && a[1] === i);
            if (t) {
              return <ProxyImg src={t[2]} size={15} className="custom-emoji" />;
            } else {
              return i;
            }
          });
        }
        return f;
      })
      .flat();
  }

  function transformText(frag: TextFragment) {
    let fragments = extractMentions(frag);
    fragments = extractLinks(fragments);
    fragments = extractInvoices(fragments);
    fragments = extractHashtags(fragments);
    fragments = extractCashuTokens(fragments);
    fragments = extractCustomEmoji(fragments);
    return fragments;
  }

  const element = useMemo(() => {
    return <div className="text">{transformText({ body: [content], tags })}</div>;
  }, [content]);

  return <div dir="auto">{element}</div>;
}
