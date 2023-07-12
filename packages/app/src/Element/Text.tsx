import "./Text.css";
import { useMemo } from "react";
import { HexKey, ParsedFragment, transformText } from "@snort/system";

import Invoice from "Element/Invoice";
import Hashtag from "Element/Hashtag";
import HyperText from "Element/HyperText";
import CashuNuts from "Element/CashuNuts";
import RevealMedia from "./RevealMedia";
import { ProxyImg } from "./ProxyImg";

export interface TextProps {
  content: string;
  creator: HexKey;
  tags: Array<Array<string>>;
  disableMedia?: boolean;
  disableMediaSpotlight?: boolean;
  depth?: number;
}

export default function Text({ content, tags, creator, disableMedia, depth, disableMediaSpotlight }: TextProps) {
  function renderChunk(f: Array<ParsedFragment>) {
    if (f.every(a => a.type === "media") && f.length === 1) {
      if (disableMedia ?? false) {
        return (
          <a href={f[0].content} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" className="ext">
            {f[0].content}
          </a>
        );
      }
      return <RevealMedia link={f[0].content} creator={creator} disableSpotlight={disableMediaSpotlight} />;
    } else {
      return (
        <div className="text-frag">
          {f.map(a => {
            switch (a.type) {
              case "invoice":
                return <Invoice invoice={a.content} />;
              case "hashtag":
                return <Hashtag tag={a.content} />;
              case "cashu":
                return <CashuNuts token={a.content} />;
              case "media":
              case "link":
                return <HyperText link={a.content} depth={depth} />;
              case "custom_emoji":
                return <ProxyImg src={a.content} size={15} className="custom-emoji" />;
              default:
                return <>{a.content}</>;
            }
          })}
        </div>
      );
    }
  }
  const elements = useMemo(() => {
    const frags = transformText(content, tags);
    const chunked = frags.reduce((acc, v) => {
      if (v.type === "media" && !(v.mimeType?.startsWith("unknown") ?? true)) {
        if (acc.length === 0) {
          acc.push([], [v]);
        } else {
          acc.push([v]);
        }
      } else {
        if (acc.length === 0) {
          acc.push([v]);
        } else {
          acc[0].push(v);
        }
      }
      return acc;
    }, [] as Array<Array<ParsedFragment>>);
    return chunked.reverse();
  }, [content]);

  return (
    <div dir="auto" className="text">
      {elements.map(a => renderChunk(a))}
    </div>
  );
}
