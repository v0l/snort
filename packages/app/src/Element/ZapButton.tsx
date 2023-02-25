import "./ZapButton.css";
import { faBolt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import { useLongPress } from "use-long-press";

import { useUserProfile } from "Feed/ProfileFeed";
import { HexKey } from "@snort/nostr";
import SendSats from "Element/SendSats";

const ZapButton = ({ pubkey, lnurl }: { pubkey: HexKey; lnurl?: string }) => {
  const profile = useUserProfile(pubkey);
  const [zap, setZap] = useState(false);
  const service = lnurl ?? (profile?.lud16 || profile?.lud06);
  const longPress = useLongPress(() => {
    console.debug("long press");
  });

  if (!service) return null;

  return (
    <>
      <div className="zap-button" {...longPress()}>
        <FontAwesomeIcon icon={faBolt} />
      </div>
      <SendSats
        target={profile?.display_name || profile?.name}
        lnurl={service}
        show={zap}
        onClose={() => setZap(false)}
        author={pubkey}
      />
    </>
  );
};

export default ZapButton;
