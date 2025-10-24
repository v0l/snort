import { decodeInvoice } from "@snort/shared";
import classNames from "classnames";
import { useState } from "react";
import { useMemo } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import Icon from "@/Components/Icons/Icon";
import ZapModal from "@/Components/ZapModal/ZapModal";
import { useWallet } from "@/Wallet";

import messages from "../messages";

export interface InvoiceProps {
  invoice: string;
}

export default function Invoice(props: InvoiceProps) {
  const invoice = props.invoice;
  const { formatMessage } = useIntl();
  const [showInvoice, setShowInvoice] = useState(false);
  const walletState = useWallet();
  const wallet = walletState.wallet;

  const info = useMemo(() => decodeInvoice(invoice), [invoice]);
  const [isPaid, setIsPaid] = useState(false);
  const isExpired = info?.expired;
  const amount = info?.amount ?? 0;
  const description = info?.description;

  function header() {
    return (
      <>
        <h4 className="m-0 p-0 font-normal text-base leading-[19px] mb-2.5">
          <FormattedMessage {...messages.Invoice} />
        </h4>
        <Icon name="zapCircle" className="absolute top-[26px] right-5 text-font-color" />
        <ZapModal
          title={formatMessage(messages.PayInvoice)}
          invoice={invoice}
          show={showInvoice}
          onClose={() => setShowInvoice(false)}
        />
      </>
    );
  }

  async function payInvoice(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    if (wallet?.isReady) {
      try {
        await wallet.payInvoice(invoice);
        setIsPaid(true);
      } catch (error) {
        setShowInvoice(true);
      }
    } else {
      setShowInvoice(true);
    }
  }

  return (
    <>
      <div className="border rounded-2xl p-6 flex-col items-start relative bg-[image:var(--invoice-gradient)]">
        <div>{header()}</div>

        <p className="font-normal text-[37px] leading-[45px] mb-4">
          {amount > 0 && (
            <>
              {(amount / 1_000).toLocaleString()}{" "}
              <span className="text-font-secondary-color uppercase text-[21px]">sat{amount === 1_000 ? "" : "s"}</span>
            </>
          )}
        </p>

        <div className="text-font-secondary-color w-full text-base leading-[19px]">
          {description && <p className="mb-4">{description}</p>}
          {isPaid ? (
            <div className="w-full h-11 font-semibold text-[19px] leading-[23px] flex items-center justify-center bg-success text-white rounded-2xl">
              <FormattedMessage defaultMessage="Paid" />
            </div>
          ) : (
            <button
              disabled={isExpired}
              type="button"
              onClick={payInvoice}
              className="w-full h-11 font-semibold text-[19px] leading-[23px]">
              {isExpired ? <FormattedMessage {...messages.Expired} /> : <FormattedMessage {...messages.Pay} />}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
