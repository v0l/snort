import { NostrLink, TaggedNostrEvent } from "@snort/system";
import { MouseEvent } from "react";
import useImgProxy from "@/Hooks/useImgProxy";
import { transformTextCached } from "@/Hooks/useTextTransformCache";
import { Link } from "react-router-dom";
import Icon from "@/Icons/Icon";

const ImageGridItem = (props: { event: TaggedNostrEvent; onClick: (e: MouseEvent) => void }) => {
  const { event, onClick } = props;
  const { proxy } = useImgProxy();

  const parsed = transformTextCached(event.id, event.content, event.tags);
  const media = parsed.filter(
    a => a.type === "media" && (a.mimeType?.startsWith("image/") || a.mimeType?.startsWith("video/")),
  );

  if (media.length === 0) return null;

  const multiple = media.length > 1;
  const isVideo = media[0].mimeType?.startsWith("video/");
  const noteId = NostrLink.fromEvent(event).encode(CONFIG.eventLinkPrefix);

  const myOnClick = (clickEvent: MouseEvent) => {
    if (onClick) {
      onClick(clickEvent);
      clickEvent.preventDefault();
    }
  };

  return (
    <Link to={`/${noteId}`} className="aspect-square cursor-pointer hover:opacity-80 relative" onClick={myOnClick}>
      <img src={proxy(media[0].content, 256)} alt="Note Media" className="w-full h-full object-cover" />
      <div className="absolute right-2 top-2 flex flex-col gap-2">
        {multiple && <Icon name="copy-solid" className="text-white opacity-80 drop-shadow-md" />}
        {isVideo && <Icon name="play-square-outline" className="text-white opacity-80 drop-shadow-md" />}
      </div>
    </Link>
  );
};

export default ImageGridItem;
