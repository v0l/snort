import { FullRelaySettings } from "@snort/system";
import { useState } from "react";

import Nostrich from "@/assets/img/nostrich.webp";
import Icon from "@/Components/Icons/Icon";

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

interface RelaysMetadataProps {
  relays: FullRelaySettings[];
}

const RelaysMetadata = ({ relays }: RelaysMetadataProps) => {
  return (
    <>
      {relays?.map(({ url, settings }) => {
        return (
          <div key={url} className="card flex gap-2">
            <RelayFavicon url={url} />
            <code className="grow f-ellipsis">{url}</code>
            <div className="flex gap-2">
              <Icon name="read" className={settings.read ? "text-highlight" : "disabled"} />
              <Icon name="write" className={settings.write ? "text-highlight" : "disabled"} />
            </div>
          </div>
        );
      })}
    </>
  );
};

export default RelaysMetadata;
