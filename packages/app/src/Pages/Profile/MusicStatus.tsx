import React from "react";

import { ProxyImg } from "@/Components/ProxyImg";
import { useStatusFeed } from "@/Feed/StatusFeed";
import { findTag, unwrap } from "@/Utils";

export const MusicStatus = ({ id }: { id: string }) => {
  const status = useStatusFeed(id, true);

  if (!status.music) return null;

  const link = findTag(status.music, "r");
  const cover = findTag(status.music, "cover");

  const content = (
    <div className="flex g8">
      {cover && <ProxyImg src={cover} size={40} />}
      🎵 {unwrap(status.music).content}
    </div>
  );

  return link ? (
    <a href={link} rel="noopener noreferrer" target="_blank" className="ext">
      {content}
    </a>
  ) : (
    content
  );
};
