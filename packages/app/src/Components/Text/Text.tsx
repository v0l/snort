import { ParsedFragment, isNostrLink } from "@snort/system";
import classNames from "classnames";
import React, { lazy, ReactNode, Suspense, useContext, useState } from "react";

const CashuNuts = lazy(async () => await import("@/Components/Embed/CashuNuts"));
import Hashtag from "@/Components/Embed/Hashtag";
import HyperText from "@/Components/Embed/HyperText";
import Invoice from "@/Components/Embed/Invoice";
import { baseImageWidth, GRID_GAP, gridConfigMap, ROW_HEIGHT } from "@/Components/Text/const";
import DisableMedia from "@/Components/Text/DisableMedia";
import { useTextTransformer } from "@/Hooks/useTextTransformCache";

import RevealMedia, { RevealMediaProps } from "../Event/RevealMedia";
import { ProxyImg } from "../ProxyImg";
import HighlightedText from "./HighlightedText";
import Mention from "../Embed/Mention";
import { SpotlightContext } from "../Spotlight/SpotlightMedia";
import NostrLink from "../Embed/NostrLink";

export interface TextProps {
  id: string;
  content: string;
  creator: string;
  tags: Array<Array<string>>;
  disableMedia?: boolean;
  disableMediaSpotlight?: boolean;
  disableGallery?: boolean;
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
  disableGallery,
  depth,
  disableMediaSpotlight,
  disableLinkPreview,
  truncate,
  className,
  highlightText,
  onClick,
}: TextProps) {
  const spotlight = useContext(SpotlightContext);
  const elements = useTextTransformer(id, content, tags);

  const images = elements.filter(a => a.type === "media" && a.mimeType?.startsWith("image")).map(a => a.content);
  const onMediaClick = (e: React.MouseEvent<HTMLImageElement>) => {
    e.stopPropagation();
    spotlight?.showImages(images);
  };

  const textElementClasses = "whitespace-pre-wrap wrap-break-word";
  const renderContent = () => {
    let lenCtr = 0;

    const chunks: Array<ReactNode> = [];
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];

      if (truncate) {
        // If we've exceeded the limit after a link, stop rendering
        if (lenCtr > truncate) {
          return chunks;
        }

        // Return truncated text if on truncation boundry
        if (element.type === "text" && lenCtr + element.content.length > truncate) {
          chunks.push(<span className={textElementClasses}>{element.content.slice(0, truncate - lenCtr)}...</span>);
          return chunks;
        }

        lenCtr += element.content.length;
      }

      switch (element.type) {
        case "media": {
          // image element
          if (element.mimeType?.startsWith("image")) {
            if (disableMedia ?? false) {
              chunks.push(<DisableMedia content={element.content} />);
            } else {
              const elementsGallery = elements.slice(i);
              const gal = findGallery(elementsGallery);
              if (gal && !(disableGallery ?? false)) {
                chunks.push(buildGallery(elementsGallery.filter(a => a.content.trim().length > 0), onMediaClick, creator));
                // skip to end of galary
                i += elementsGallery.length;
              } else {
                chunks.push(
                  <RevealMedia
                    link={element.content}
                    meta={element.data}
                    size={baseImageWidth}
                    creator={creator}
                    onMediaClick={onMediaClick}
                  />,
                );
              }
            }
            continue;
          }

          // audo / video element
          if (element.mimeType?.startsWith("audio") || element.mimeType?.startsWith("video")) {
            if (disableMedia ?? false) {
              chunks.push(<DisableMedia content={element.content} />);
            } else {
              chunks.push(
                <RevealMedia
                  link={element.content}
                  meta={element.data}
                  size={baseImageWidth}
                  creator={creator}
                  onMediaClick={onMediaClick}
                />,
              );
            }
            continue;
          }

          // unknown media (link)
          chunks.push(<HyperText link={element.content} showLinkPreview={!(disableLinkPreview ?? false)} />);
          break;
        }
        case "invoice": {
          chunks.push(<Invoice invoice={element.content} />);
          break;
        }
        case "hashtag": {
          chunks.push(<Hashtag tag={element.content} />);
          break;
        }
        case "cashu": {
          chunks.push(
            <Suspense>
              <CashuNuts token={element.content} />
            </Suspense>,
          );
          break;
        }
        case "mention":
        case "link": {
          if (disableMedia ?? false) {
            chunks.push(<DisableMedia content={element.content} />);
          } else {
            if (isNostrLink(element.content)) {
              chunks.push(<NostrLink link={element.content} depth={depth} />);
            } else {
              chunks.push(<HyperText link={element.content} showLinkPreview={!(disableLinkPreview ?? false)} />);
            }
          }
          break;
        }
        case "custom_emoji": {
          chunks.push(<ProxyImg src={element.content} size={15} className="custom-emoji" />);
          break;
        }
        case "code_block": {
          chunks.push(<pre className="m-0 overflow-scroll">{element.content}</pre>);
          break;
        }
        default: {
          chunks.push(
            <>
              {highlightText ? (
                <HighlightedText content={element.content} textToHighlight={highlightText} />
              ) : (
                element.content
              )}
            </>,
          );
          break;
        }
      }
    }
    return chunks;
  };

  return (
    <div dir="auto" className={classNames(textElementClasses, className)} onClick={onClick}>
      {renderContent()}
    </div>
  );
}

/**
 * Only enable gallery if there is multiple images in a row
 */
function findGallery(elements: Array<ParsedFragment>): [number, number] | undefined {
  // If the current element is of type media and mimeType starts with image,
  // we verify if the next elements are of the same type and mimeType and push to the galleryImages
  // Whenever one of the next elements is not longer of the type we are looking for, we break the loop

  const isImage = (a: ParsedFragment) => a.type === "media" && a.mimeType?.startsWith("image");
  const firstImage = elements.findIndex(isImage);
  if (firstImage === -1) {
    return;
  }

  // from the first image in the array until the end
  for (let j = firstImage; j < elements.length; j++) {
    const nextElement = elements[j];

    // skip over empty space
    if (nextElement.type === "text" && nextElement.content.trim().length === 0) {
      continue;
    }

    if (!isImage(nextElement)) {
      return;
    }
  }

  return [firstImage, elements.length - 1];
}

function buildGallery(
  elements: Array<ParsedFragment>,
  onMediaClick: RevealMediaProps["onMediaClick"],
  creator: string,
) {
  if (elements.length === 1) {
    return <RevealMedia link={elements[0].content} meta={elements[0].data} creator={creator} onMediaClick={onMediaClick} />;
  } else {
    // We build a grid layout to render the grouped images
    const imagesWithGridConfig = elements
      .map((gi, index) => {
        const config = gridConfigMap.get(elements.length);
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
    const gallery = (
      <div className="grid grid-cols-4 gap-0.5 place-items-start">
        {imagesWithGridConfig.map(img => (
          <RevealMedia link={img.content} meta={img.data} creator={creator} onMediaClick={onMediaClick} style={{
            gridColumn: `span ${img.gridColumn}`,
            gridRow: `span ${img.gridRow}`,
            height: img.height,
            objectFit: "cover"
          }} />
        ))}
      </div>
    );
    return gallery;
  }
}
