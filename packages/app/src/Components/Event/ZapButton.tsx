import { NostrLink } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import { ZapTarget } from "@snort/wallet";
import { useState } from "react";

import Icon from "@/Components/Icons/Icon";
import ZapModal from "@/Components/ZapModal/ZapModal";

const ZapButton = ({
  pubkey,
  lnurl,
  children,
  event,
}: {
  pubkey: string;
  lnurl?: string;
  children?: React.ReactNode;
  event?: NostrLink;
}) => {
  const profile = useUserProfile(pubkey);
  const [zap, setZap] = useState(false);
  const service = lnurl ?? (profile?.lud16 || profile?.lud06);
  if (!service) return null;

  return (
    <>
      <button type="button" className="flex gap-2" onClick={() => setZap(true)}>
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
            zap: { pubkey: pubkey, event },
          } as ZapTarget,
        ]}
        show={zap}
        onClose={() => setZap(false)}
      />
    </>
  );
};

export default ZapButton;
