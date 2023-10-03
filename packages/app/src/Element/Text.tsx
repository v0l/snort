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
import HighlightedText from "./HighlightedText";
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
  highlighText?: string;
  onClick?: (e: React.MouseEvent) => void;
}

const gridConfigMap = new Map<number, number[][]>([
  [1, [[4, 3]]],
  [2, [[2, 2], [2, 2]]],
  [3, [[2, 2], [2, 1], [2, 1]]],
  [4, [[2, 1], [2, 1], [2, 1], [2, 1]]],
  [5, [[2, 1], [2, 1], [2, 1], [1, 1], [1, 1]]],
  [6, [[2, 2], [1, 1], [1, 1], [2, 2], [1, 1], [1, 1]]],
]);

const ROW_HEIGHT = 140;
const GRID_GAP = 2;

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
  highlighText,
  onClick,
}: TextProps) {
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [imageIdx, setImageIdx] = useState(0);

  const elements = useTextTransformer(id, content, tags);

  const images = elements.filter(a => a.type === "media" && a.mimeType?.startsWith("image")).map(a => a.content);

  function renderContentWithHighlightedText(content: string, textToHighlight: string) {
    const textToHighlightArray = textToHighlight.trim().toLowerCase().split(" ");
    const re = new RegExp(`(${textToHighlightArray.join("|")})`, "gi");
    const splittedContent = content.split(re);

    const fragments = splittedContent.map(c => {
      if (textToHighlightArray.includes(c.toLowerCase())) {
        return {
          type: "highlighted_text",
          content: c,
        } as ParsedFragment;
      }

      return c;
    });

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

  const DisableMedia = ({ content }: { content: string }) => (
    <a
      href={content}
      onClick={(e) => e.stopPropagation()}
      target="_blank"
      rel="noreferrer"
      className="ext"
    >
      {content}
    </a>
  );

  const RevealMediaInstance = ({ content }: { content: string }) => (
    <RevealMedia
      key={content}
      link={content}
      creator={creator}
      onMediaClick={(e) => {
        if (!disableMediaSpotlight) {
          e.stopPropagation();
          e.preventDefault();
          setShowSpotlight(true);
          const selected = images.findIndex((b) => b === content);
          setImageIdx(selected === -1 ? 0 : selected);
        }
      }}
    />
  );

  const renderContent = () => {
    let lenCtr = 0;

    let chunks: (JSX.Element | null)[] = [];
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];

      if (truncate) {
        if (lenCtr > truncate) {
          continue;
        } else if (lenCtr + element.content.length > truncate) {
          lenCtr += element.content.length;
          chunks = chunks.concat(<div className="text-frag">{element.content.slice(0, truncate - lenCtr)}...</div>);
        } else {
          lenCtr += element.content.length;
        }
      }

      if (element.type === "media" && element.mimeType?.startsWith("image")) {
        if (disableMedia ?? false) {
          chunks = chunks.concat(<DisableMedia content={element.content} />);
        } else {
          let galleryImages: ParsedFragment[] = [element];
          // If the current element is of type media and mimeType starts with image,
          // we verify if the next elements are of the same type and mimeType and push to the galleryImages
          // Whenever one of the next elements is not longer of the type we are looking for, we break the loop
          for (let j = i; j < elements.length; j++) {
            const nextElement = elements[j + 1];
          
            if (
              nextElement &&
              nextElement.type === "media" &&
              nextElement.mimeType?.startsWith("image")
            ) {
              galleryImages = galleryImages.concat(nextElement);
              i++;
            } else {
              break;
            }
          }

          // We build a grid layout to render the grouped images
          const imagesWithGridConfig = galleryImages.map((gi, index) => {
            const config = gridConfigMap.get(galleryImages.length);
            let height = ROW_HEIGHT;

            if (config && config[index][1] > 1) {
              height = (config[index][1] * ROW_HEIGHT) + GRID_GAP;
            }

            return {
              content: gi.content,
              gridColumn: config ? config[index][0] : 1,
              gridRow: config ? config[index][1] : 1,
              height,
            }
          });
          const gallery = (
            <div className="gallery">
              {
                imagesWithGridConfig.map((img) => (
                  <div
                    key={img.content}
                    className="gallery-item"
                    style={{
                      height: `${img.height}px`,
                      gridColumn: `span ${img.gridColumn}`,
                      gridRow: `span ${img.gridRow}`,
                    }}
                  >
                    <RevealMediaInstance content={img.content} />
                  </div>
                ))
              }
            </div>
          );
          chunks = chunks.concat(gallery);
        }
      }

      if (element.type === "media" && (element.mimeType?.startsWith("audio") || element.mimeType?.startsWith("video"))) {
        if (disableMedia ?? false) {
          chunks = chunks.concat(<DisableMedia content={element.content} />);          
        } else {
          chunks = chunks.concat(<RevealMediaInstance content={element.content} />);
        }
      }
      if (element.type === "invoice") {
        chunks = chunks.concat(<Invoice invoice={element.content} />);
      }
      if (element.type === "hashtag") {
        chunks = chunks.concat(<Hashtag tag={element.content} />);
      }
      if (element.type === "cashu") {
        chunks = chunks.concat(<CashuNuts token={element.content} />);
      }
      if(element.type === "link" || (element.type === 'media' && element.mimeType?.startsWith('unknown'))) {
        chunks = chunks.concat(<HyperText link={element.content} depth={depth} showLinkPreview={!(disableLinkPreview ?? false)} />);
      }
      if (element.type === "custom_emoji") {
        chunks = chunks.concat(<ProxyImg src={element.content} size={15} className="custom-emoji" />);
      }
      if (element.type === "text") {
        chunks = chunks.concat(
          <div className="text-frag">
            {highlighText
              ? renderContentWithHighlightedText(element.content, highlighText)
              : element.content}
          </div>,
        );
        
      }
    }
    return chunks;
  };

  return (
    <div dir="auto" className={`text${className ? ` ${className}` : ""}`} onClick={onClick}>
      {renderContent()}
      {showSpotlight && <SpotlightMediaModal images={images} onClose={() => setShowSpotlight(false)} idx={imageIdx} />}
    </div>
  );
}
