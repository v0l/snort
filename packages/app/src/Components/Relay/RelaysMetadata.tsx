import "./RelaysMetadata.css";
import Nostrich from "@/assets/img/nostrich.webp";
import { useState } from "react";

import { FullRelaySettings } from "@snort/system";
import Icon from "@/Components/Icons/Icon";

export const RelayFavicon = ({ url }: { url: string }) => {
  const cleanUrl = url
    .replace(/^wss:\/\//, "https://")
    .replace(/^ws:\/\//, "http://")
    .replace(/\/$/, "");
  const [faviconUrl, setFaviconUrl] = useState(`${cleanUrl}/favicon.ico`);
  return (
    <img
      className="circle favicon"
      src={faviconUrl}
      onError={() => setFaviconUrl(Nostrich)}
      alt={`favicon for ${url}`}
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
          <div key={url} className="card flex g8">
            <RelayFavicon url={url} />
            <code className="grow f-ellipsis">{url}</code>
            <div className="flex g8">
              <Icon name="read" className={settings.read ? "relay-active" : "disabled"} />
              <Icon name="write" className={settings.write ? "relay-active" : "disabled"} />
            </div>
          </div>
        );
      })}
    </>
  );
};

export default RelaysMetadata;
