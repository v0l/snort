import { useState } from "react";

import Nostrich from "@/assets/img/nostrich.webp";

export const RelayFavicon = ({ url, size }: { url: string; size?: number }) => {
  const cleanUrl = url
    .replace(/^wss:\/\//, "https://")
    .replace(/^ws:\/\//, "http://")
    .replace(/\/$/, "");
  const [faviconUrl, setFaviconUrl] = useState(`${cleanUrl}/favicon.ico`);
  return (
    <img
      className="rounded-full object-cover"
      src={faviconUrl}
      onError={() => setFaviconUrl(Nostrich)}
      alt={`favicon for ${url}`}
      width={size ?? 20}
      height={size ?? 20}
    />
  );
};
