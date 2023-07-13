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
  function renderChunk(a: ParsedFragment) {
    if (a.type === "media" && !a.mimeType?.startsWith("unknown")) {
      if (disableMedia ?? false) {
        return (
          <a href={a.content} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" className="ext">
            {a.content}
          </a>
        );
      }
      return <RevealMedia link={a.content} creator={creator} disableSpotlight={disableMediaSpotlight} />;
    } else {
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
          return <div className="text-frag">{a.content}</div>;
      }
    }
  }

  const elements = useMemo(() => {
    return transformText(content, tags);
  }, [content]);

  return (
    <div dir="auto" className="text">
      {elements.map(a => renderChunk(a))}
    </div>
  );
}
