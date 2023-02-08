import "./Relays.css";
import Nostrich from "nostrich.webp";
import { useState } from "react";

import Read from "Icons/Read";
import Write from "Icons/Write";

export interface RelaySpec {
  url: string;
  settings: { read: boolean; write: boolean };
}

interface RelaysProps {
  relays: RelaySpec[];
}

const RelayFavicon = ({ url }: { url: string }) => {
  const cleanUrl = url.replace("wss://relay.", "https://").replace("wss://nostr.", "https://");
  const [faviconUrl, setFaviconUrl] = useState(`${cleanUrl}/favicon.ico`);

  return <img className="favicon" src={faviconUrl} onError={() => setFaviconUrl(Nostrich)} />;
};

const Relays = ({ relays }: RelaysProps) => {
  return (
    <div className="main-content">
      {relays?.map(({ url, settings }) => {
        return (
          <div className="card relay-card">
            <RelayFavicon url={url} />
            <code>{url}</code>
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

export default Relays;
