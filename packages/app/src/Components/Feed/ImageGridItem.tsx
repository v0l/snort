import { NostrLink, TaggedNostrEvent } from "@snort/system";
import { MouseEvent, ReactNode } from "react";
import { useInView } from "react-intersection-observer";
import { Link } from "react-router-dom";

import Icon from "@/Components/Icons/Icon";
import { ProxyImg } from "@/Components/ProxyImg";
import getEventMedia from "@/Utils/getEventMedia";

export interface ImageGridItemProps {
  event: TaggedNostrEvent;
  onClick?: (event: MouseEvent) => void;
  waitUntilInView?: boolean;
}

const ImageGridItem = (props: ImageGridItemProps) => {
  const { event, onClick } = props;
  const { ref, inView } = useInView({ triggerOnce: true, rootMargin: "2000px" });

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
    if (props.waitUntilInView && !inView) return undefined;
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
};

export default ImageGridItem;
