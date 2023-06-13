import "./ZapButton.css";
import { useState } from "react";
import { HexKey } from "@snort/system";

import { useUserProfile } from "Hooks/useUserProfile";
import SendSats from "Element/SendSats";
import Icon from "Icons/Icon";

const ZapButton = ({ pubkey, lnurl, children }: { pubkey: HexKey; lnurl?: string; children?: React.ReactNode }) => {
  const profile = useUserProfile(pubkey);
  const [zap, setZap] = useState(false);
  const service = lnurl ?? (profile?.lud16 || profile?.lud06);
  if (!service) return null;

  return (
    <>
      <div className="zap-button flex" onClick={() => setZap(true)}>
        <Icon name="zap" className={children ? "mr5" : ""} size={15} />
        {children}
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
