import React from "react";
import { FormattedMessage } from "react-intl";

import { ZapType } from "@/Components/ZapModal/ZapType";
import useLogin from "@/Hooks/useLogin";

export function ZapTypeSelector({ zapType, setZapType }: { zapType: ZapType; setZapType: (t: ZapType) => void }) {
  const { readonly } = useLogin(s => ({ readonly: s.readonly }));
  const makeTab = (t: ZapType, n: React.ReactNode) => (
    <button type="button" className={zapType === t ? "" : "secondary"} onClick={() => setZapType(t)}>
      {n}
    </button>
  );
  return (
    <div className="flex flex-col g8">
      <h3>
        <FormattedMessage defaultMessage="Zap Type" id="+aZY2h" />
      </h3>
      <div className="flex g8">
        {!readonly &&
          makeTab(ZapType.PublicZap, <FormattedMessage defaultMessage="Public" id="/PCavi" description="Public Zap" />)}
        {/*makeTab(ZapType.PrivateZap, "Private")*/}
        {makeTab(ZapType.AnonZap, <FormattedMessage defaultMessage="Anon" id="wWLwvh" description="Anonymous Zap" />)}
        {makeTab(
          ZapType.NonZap,
          <FormattedMessage defaultMessage="Non-Zap" id="AnLrRC" description="Non-Zap, Regular LN payment" />,
        )}
      </div>
    </div>
  );
}
