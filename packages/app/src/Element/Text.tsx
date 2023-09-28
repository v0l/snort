import "./Text.css";
import { useState } from "react";
import { HexKey, ParsedFragment } from "@snort/system";

import Invoice from "Element/Embed/Invoice";
import Hashtag from "Element/Embed/Hashtag";
import HyperText from "Element/HyperText";
import CashuNuts from "Element/Embed/CashuNuts";
import RevealMedia from "./Event/RevealMedia";
import { ProxyImg } from "./ProxyImg";
import { SpotlightMediaModal } from "./Deck/SpotlightMedia";
import { useTextTransformer } from "Hooks/useTextTransformCache";

export interface TextProps {
  id: string;
  content: string;
  creator: HexKey;
  tags: Array<Array<string>>;
  disableMedia?: boolean;
  disableMediaSpotlight?: boolean;
  disableLinkPreview?: boolean;
  depth?: number;
  truncate?: number;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export default function Text({
  id,
  content,
  tags,
  creator,
  disableMedia,
  depth,
  disableMediaSpotlight,
  disableLinkPreview,
  truncate,
  className,
  onClick,
}: TextProps) {
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [imageIdx, setImageIdx] = useState(0);

  const elements = useTextTransformer(id, content, tags);

  const images = elements.filter(a => a.type === "media" && a.mimeType?.startsWith("image")).map(a => a.content);

  const renderContent = () => {
    let lenCtr = 0;
    function renderChunk(a: ParsedFragment) {
      if (truncate) {
        if (lenCtr > truncate) {
          return null;
        } else if (lenCtr + a.content.length > truncate) {
          lenCtr += a.content.length;
          return <div className="text-frag">{a.content.slice(0, truncate - lenCtr)}...</div>;
        } else {
          lenCtr += a.content.length;
        }
      }

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
            return <HyperText link={a.content} depth={depth} showLinkPreview={!(disableLinkPreview ?? false)} />;
          case "custom_emoji":
            return <ProxyImg src={a.content} size={15} className="custom-emoji" />;
          default:
            return <div className="text-frag">{a.content}</div>;
        }
      }
    }

    return elements.map(a => renderChunk(a));
  };

  return (
    <div dir="auto" className={`text${className ? ` ${className}` : ""}`} onClick={onClick}>
      {renderContent()}
      {showSpotlight && <SpotlightMediaModal images={images} onClose={() => setShowSpotlight(false)} idx={imageIdx} />}
    </div>
  );
}
