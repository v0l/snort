import "./Text.css";
import { useMemo, useState } from "react";
import { HexKey, ParsedFragment, transformText } from "@snort/system";

import Invoice from "Element/Invoice";
import Hashtag from "Element/Hashtag";
import HyperText from "Element/HyperText";
import CashuNuts from "Element/CashuNuts";
import RevealMedia from "./RevealMedia";
import { ProxyImg } from "./ProxyImg";
import { SpotlightMedia } from "./SpotlightMedia";
import HighlightedText from "./HighlightedText";

export interface TextProps {
  content: string;
  creator: HexKey;
  tags: Array<Array<string>>;
  disableMedia?: boolean;
  disableMediaSpotlight?: boolean;
  depth?: number;
  highlighText?: string;
}

export default function Text({ content, tags, creator, disableMedia, depth, disableMediaSpotlight, highlighText }: TextProps) {
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [imageIdx, setImageIdx] = useState(0);

  const elements = useMemo(() => {
    return transformText(content, tags);
  }, [content]);

  const images = elements.filter(a => a.type === "media" && a.mimeType?.startsWith("image")).map(a => a.content);

  function renderContentWithHighlightedText(content: string, textToHighlight: string) {
    const textToHighlightArray = textToHighlight.trim().toLowerCase().split(' ');
    const re = new RegExp(`(${textToHighlightArray.join('|')})`, 'gi');
    const splittedContent = content.split(re);

    const fragments = splittedContent.map(c => {
      if (textToHighlightArray.includes(c.toLowerCase())) {
        return {
          type: 'highlighted_text',
          content: c,
        } as ParsedFragment;
      }

      return c;
    })

    return (
      <>
        {fragments.map(f => {
          if (typeof f === "string") {
            return f;
          }

          return <HighlightedText content={f.content} />;
        })}
      </>
    );
  }

  function renderChunk(a: ParsedFragment) {
    if (a.type === "media" && !a.mimeType?.startsWith("unknown")) {
      if (disableMedia ?? false) {
        return (
          <a href={a.content} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" className="ext">
            {a.content}
          </a>
        );
      }
      return (
        <RevealMedia
          link={a.content}
          creator={creator}
          onMediaClick={e => {
            if (!disableMediaSpotlight) {
              e.stopPropagation();
              e.preventDefault();
              setShowSpotlight(true);
              const selected = images.findIndex(b => b === a.content);
              setImageIdx(selected === -1 ? 0 : selected);
            }
          }}
        />
      );
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
          return <div className="text-frag">
            {highlighText ? renderContentWithHighlightedText(a.content, highlighText) : a.content}
          </div>;
      }
    }
  }

  return (
    <div dir="auto" className="text">
      {elements.map(a => renderChunk(a))}
      {showSpotlight && <SpotlightMedia images={images} onClose={() => setShowSpotlight(false)} idx={imageIdx} />}
    </div>
  );
}
