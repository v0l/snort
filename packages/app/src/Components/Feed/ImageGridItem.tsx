import { EventKind, NostrLink, type TaggedNostrEvent } from "@snort/system";
import { memo, type MouseEvent, type ReactNode } from "react";
import { useInView } from "react-intersection-observer";
import { Link } from "react-router-dom";

import Icon from "@/Components/Icons/Icon";
import { ProxyImg } from "@/Components/ProxyImg";
import getEventMedia from "@/Utils/getEventMedia";

interface ImageGridItemProps {
  event: TaggedNostrEvent;
  onClick?: (event: MouseEvent) => void;
  waitUntilInView?: boolean;
}

const ImageGridItem = memo((props: ImageGridItemProps) => {
  const { event, onClick, waitUntilInView } = props;
  const { ref, inView } = useInView({ triggerOnce: true, rootMargin: "0px 0px 3000px 0px" });

  // skip reposts in image grid
  if (event.kind === EventKind.Repost) return null;

  const media = getEventMedia(event);
  if (media.length === 0) return null;

  const multiple = media.length > 1;
  const isVideo = media[0].mimeType?.startsWith("video/");
  const noteId = NostrLink.fromEvent(event).encode(CONFIG.eventLinkPrefix);

  const myOnClick = (clickEvent: MouseEvent) => {
    if (onClick && window.innerWidth >= 768) {
      onClick(clickEvent);
      clickEvent.preventDefault();
    }
  };

  const renderContent = (): ReactNode | undefined => {
    if (waitUntilInView && !inView) return undefined;
    return (
      <>
        <ProxyImg src={media[0].content} alt="Note Media" size={311} className="w-full h-full object-cover" />
        <div className="absolute right-2 top-2 flex flex-col gap-2">
          {multiple && <Icon name="copy-solid" className="text-white opacity-80 drop-shadow-md" />}
          {isVideo && <Icon name="play-square-outline" className="text-white opacity-80 drop-shadow-md" />}
        </div>
      </>
    );
  };

  return (
    <Link
      to={`/${noteId}`}
      className="aspect-square cursor-pointer hover:opacity-80 relative"
      onClick={myOnClick}
      ref={ref}>
      {renderContent()}
    </Link>
  );
});

ImageGridItem.displayName = "ImageGridItem";

export default ImageGridItem;
