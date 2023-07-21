import "./RelaysMetadata.css";
import Nostrich from "public/logo_256.png";
import { useState } from "react";

import { FullRelaySettings } from "@snort/system";
import Icon from "Icons/Icon";

const RelayFavicon = ({ url }: { url: string }) => {
  const cleanUrl = url
    .replace(/^wss:\/\//, "https://")
    .replace(/^ws:\/\//, "http://")
    .replace(/\/$/, "");
  const [faviconUrl, setFaviconUrl] = useState(`${cleanUrl}/favicon.ico`);
  return (
    <img className="favicon" src={faviconUrl} onError={() => setFaviconUrl(Nostrich)} alt={`favicon for ${url}`} />
  );
};

interface RelaysMetadataProps {
  relays: FullRelaySettings[];
}

const RelaysMetadata = ({ relays }: RelaysMetadataProps) => {
  return (
    <div className="main-content">
      {relays?.map(({ url, settings }) => {
        return (
          <div key={url} className="card relay-card">
            <RelayFavicon url={url} />
            <code className="relay-url f-ellipsis">{url}</code>
            <div className="relay-settings">
              <Icon name="read" className={settings.read ? "enabled" : "disabled"} />
              <Icon name="write" className={settings.write ? "enabled" : "disabled"} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RelaysMetadata;
