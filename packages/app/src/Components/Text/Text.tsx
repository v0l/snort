import "./Text.css";

import { HexKey, IMeta, ParsedFragment } from "@snort/system";
import classNames from "classnames";
import { ReactNode, useState } from "react";

import CashuNuts from "@/Components/Embed/CashuNuts";
import Hashtag from "@/Components/Embed/Hashtag";
import HyperText from "@/Components/Embed/HyperText";
import Invoice from "@/Components/Embed/Invoice";
import { baseImageWidth, GRID_GAP, gridConfigMap, ROW_HEIGHT } from "@/Components/Text/const";
import DisableMedia from "@/Components/Text/DisableMedia";
import { useTextTransformer } from "@/Hooks/useTextTransformCache";

import RevealMedia from "../Event/RevealMedia";
import { ProxyImg } from "../ProxyImg";
import { SpotlightMediaModal } from "../Spotlight/SpotlightMedia";
import HighlightedText from "./HighlightedText";

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
  highlightText?: string;
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
  highlightText,
  onClick,
}: TextProps) {
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [imageIdx, setImageIdx] = useState(0);

  const elements = useTextTransformer(id, content, tags);
  const images = elements.filter(a => a.type === "media" && a.mimeType?.startsWith("image")).map(a => a.content);

  const RevealMediaInstance = ({ content, data, size }: { content: string; data?: object; size?: number }) => {
    const imeta = data as IMeta | undefined;

    return (
      <RevealMedia
        key={content}
        link={content}
        creator={creator}
        meta={imeta}
        size={size}
        onMediaClick={e => {
          if (!disableMediaSpotlight) {
            e.stopPropagation();
            e.preventDefault();
            setShowSpotlight(true);
            const selected = images.findIndex(b => b === content);
            setImageIdx(selected === -1 ? 0 : selected);
          }
        }}
      />
    );
  };

  const renderContent = () => {
    let lenCtr = 0;

    const chunks: Array<ReactNode> = [];
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];

      if (truncate) {
        if (lenCtr + element.content.length > truncate) {
          lenCtr += element.content.length;
          chunks.push(<div className="text-frag">{element.content.slice(0, truncate - lenCtr)}...</div>);
          return chunks;
        } else {
          lenCtr += element.content.length;
        }
      }

      if (element.type === "media" && element.mimeType?.startsWith("image")) {
        if (disableMedia ?? false) {
          chunks.push(<DisableMedia content={element.content} />);
        } else {
          const galleryImages: ParsedFragment[] = [element];
          // If the current element is of type media and mimeType starts with image,
          // we verify if the next elements are of the same type and mimeType and push to the galleryImages
          // Whenever one of the next elements is not longer of the type we are looking for, we break the loop
          for (let j = i; j < elements.length; j++) {
            const nextElement = elements[j + 1];

            if (nextElement && nextElement.type === "media" && nextElement.mimeType?.startsWith("image")) {
              galleryImages.push(nextElement);
              i++;
            } else if (nextElement && nextElement.type === "text" && nextElement.content.trim().length === 0) {
              i++; //skip over empty space text
            } else {
              break;
            }
          }
          if (galleryImages.length === 1) {
            chunks.push(
              <RevealMediaInstance
                content={galleryImages[0].content}
                data={galleryImages[0].data}
                size={baseImageWidth}
              />,
            );
          } else {
            // We build a grid layout to render the grouped images
            const imagesWithGridConfig = galleryImages.map((gi, index) => {
              const config = gridConfigMap.get(galleryImages.length);
              let height = ROW_HEIGHT;

              if (config && config[index][1] > 1) {
                height = config[index][1] * ROW_HEIGHT + GRID_GAP;
              }

              return {
                content: gi.content,
                data: gi.data,
                gridColumn: config ? config[index][0] : 1,
                gridRow: config ? config[index][1] : 1,
                height,
              };
            });
            const size = Math.floor(baseImageWidth / Math.min(4, Math.ceil(Math.sqrt(galleryImages.length))));
            const gallery = (
              <div className="-mx-4 md:mx-0 my-2 gallery">
                {imagesWithGridConfig.map(img => (
                  <div
                    key={img.content}
                    className="gallery-item"
                    style={{
                      height: `${img.height}px`,
                      gridColumn: `span ${img.gridColumn}`,
                      gridRow: `span ${img.gridRow}`,
                    }}>
                    <RevealMediaInstance content={img.content} data={img.data} size={size} />
                  </div>
                ))}
              </div>
            );
            chunks.push(gallery);
          }
        }
      }

      if (
        element.type === "media" &&
        (element.mimeType?.startsWith("audio") || element.mimeType?.startsWith("video"))
      ) {
        if (disableMedia ?? false) {
          chunks.push(<DisableMedia content={element.content} />);
        } else {
          chunks.push(<RevealMediaInstance content={element.content} data={element.data} size={baseImageWidth} />);
        }
      }
      if (element.type === "invoice") {
        chunks.push(<Invoice invoice={element.content} />);
      }
      if (element.type === "hashtag") {
        chunks.push(<Hashtag tag={element.content} />);
      }
      if (element.type === "cashu") {
        chunks.push(<CashuNuts token={element.content} />);
      }
      if (element.type === "link" || (element.type === "media" && element.mimeType?.startsWith("unknown"))) {
        if (disableMedia ?? false) {
          chunks.push(<DisableMedia content={element.content} />);
        } else {
          chunks.push(
            <HyperText link={element.content} depth={depth} showLinkPreview={!(disableLinkPreview ?? false)} />,
          );
        }
      }
      if (element.type === "custom_emoji") {
        chunks.push(<ProxyImg src={element.content} size={15} className="custom-emoji" />);
      }
      if (element.type === "code_block") {
        chunks.push(<pre>{element.content}</pre>);
      }
      if (element.type === "text") {
        chunks.push(
          <div className="text-frag">
            {highlightText ? (
              <HighlightedText content={element.content} textToHighlight={highlightText} />
            ) : (
              element.content
            )}
          </div>,
        );
      }
    }
    return chunks;
  };

  return (
    <div dir="auto" className={classNames("text", className)} onClick={onClick}>
      {renderContent()}
      {showSpotlight && <SpotlightMediaModal media={images} onClose={() => setShowSpotlight(false)} idx={imageIdx} />}
    </div>
  );
}
