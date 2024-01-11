import "./ZapButton.css";

import { HexKey } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import { useState } from "react";

import Icon from "@/Components/Icons/Icon";
import ZapModal from "@/Components/ZapModal/ZapModal";
import { ZapTarget } from "@/Utils/Zapper";

const ZapButton = ({
  pubkey,
  lnurl,
  children,
  event,
}: {
  pubkey: HexKey;
  lnurl?: string;
  children?: React.ReactNode;
  event?: string;
}) => {
  const profile = useUserProfile(pubkey);
  const [zap, setZap] = useState(false);
  const service = lnurl ?? (profile?.lud16 || profile?.lud06);
  if (!service) return null;

  return (
    <>
      <button type="button" className="flex g8" onClick={() => setZap(true)}>
        <Icon name="zap-solid" />
        {children}
      </button>
      <ZapModal
        targets={[
          {
            type: "lnurl",
            value: service,
            weight: 1,
            name: profile?.display_name || profile?.name,
            zap: { pubkey: pubkey },
          } as ZapTarget,
        ]}
        show={zap}
        onClose={() => setZap(false)}
        note={event}
      />
    </>
  );
};

export default ZapButton;
