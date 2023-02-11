import "./ZapButton.css";
import { faBolt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import { useUserProfile } from "Feed/ProfileFeed";
import { HexKey } from "Nostr";
import SendSats from "Element/SendSats";

const ZapButton = ({ pubkey, lnurl }: { pubkey: HexKey; lnurl?: string }) => {
  const profile = useUserProfile(pubkey);
  const [zap, setZap] = useState(false);

  if (!(lnurl || profile?.lud16 || profile?.lud06 || profile?.nip57)) return null;

  return (
    <>
      <div className="zap-button" onClick={() => setZap(true)}>
        <FontAwesomeIcon icon={faBolt} />
      </div>
      <SendSats
        target={profile?.display_name || profile?.name}
        lnurl={lnurl || profile?.lud16 || profile?.lud06}
        nip57={profile?.nip57}
        show={zap}
        onClose={() => setZap(false)}
        author={pubkey}
      />
    </>
  );
};

export default ZapButton;
