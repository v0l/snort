import React from "react";
import { FormattedMessage } from "react-intl";

import { ZapType } from "@/Components/ZapModal/ZapType";
import useLogin from "@/Hooks/useLogin";
import AsyncButton from "../Button/AsyncButton";

export function ZapTypeSelector({ zapType, setZapType }: { zapType: ZapType; setZapType: (t: ZapType) => void }) {
  const { readonly } = useLogin(s => ({ readonly: s.readonly }));
  const makeTab = (t: ZapType, n: React.ReactNode) => (
    <AsyncButton className={zapType === t ? "!bg-neutral-400" : ""} onClick={() => setZapType(t)}>
      {n}
    </AsyncButton>
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="font-medium">
        <FormattedMessage defaultMessage="Zap Type:" />
      </div>
      <div className="flex gap-2">
        {!readonly && makeTab(ZapType.PublicZap, <FormattedMessage defaultMessage="Public" />)}
        {/*makeTab(ZapType.PrivateZap, "Private")*/}
        {makeTab(ZapType.AnonZap, <FormattedMessage defaultMessage="Anon" />)}
        {makeTab(ZapType.NonZap, <FormattedMessage defaultMessage="Non-Zap" />)}
      </div>
    </div>
  );
}
