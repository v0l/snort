import { LNWallet, ZapTargetResult } from "@snort/wallet";
import { ReactNode } from "react";
import { FormattedMessage } from "react-intl";

import Copy from "@/Components/Copy/Copy";
import QrCode from "@/Components/QrCode";
import AsyncButton from "../Button/AsyncButton";

export function ZapModalInvoice(props: {
  invoice: Array<ZapTargetResult>;
  wallet?: LNWallet;
  notice?: ReactNode;
  onInvoicePaid: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 txt-center">
      {props.notice && <b className="error">{props.notice}</b>}
      {props.invoice.map(v => (
        <>
          <QrCode data={v.pr} link={`lightning:${v.pr}`} />
          <Copy text={v.pr} maxSize={26} className="items-center" />
          <a href={`lightning:${v.pr}`}>
            <AsyncButton>
              <FormattedMessage defaultMessage="Open Wallet" />
            </AsyncButton>
          </a>
        </>
      ))}
    </div>
  );
}
