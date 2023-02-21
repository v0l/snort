import "./RelaysMetadata.css";
import Nostrich from "nostrich.webp";
import { useState } from "react";

import { FullRelaySettings } from "@snort/nostr";
import Read from "Icons/Read";
import Write from "Icons/Write";

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
              <Read className={settings.read ? "enabled" : "disabled"} />
              <Write className={settings.write ? "enabled" : "disabled"} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RelaysMetadata;
