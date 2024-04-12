import { useState } from "react";

import Icon from "../Icons/Icon";
import { ProxyImg } from "../ProxyImg";

export default function GenericPlayer({ url, poster }: { url: string; poster: string }) {
  const [play, setPlay] = useState(false);

  if (!play) {
    return (
      <div
        className="relative aspect-video"
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          setPlay(true);
        }}>
        <ProxyImg className="absolute" src={poster} />
        <div className="absolute w-full h-full opacity-0 hover:opacity-100 hover:bg-black/30 flex items-center justify-center transition">
          <Icon name="play-square-outline" size={50} />
        </div>
      </div>
    );
  }
  return (
    <iframe
      className="aspect-video w-full"
      src={url}
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen={true}
    />
  );
}
