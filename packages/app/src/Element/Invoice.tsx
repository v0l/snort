import "./Invoice.css";
import { useState } from "react";
import { useIntl, FormattedMessage } from "react-intl";
import { useMemo } from "react";

import SendSats from "Element/SendSats";
import Icon from "Icons/Icon";
import { useWallet } from "Wallet";
import { decodeInvoice } from "Util";

import messages from "./messages";

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
        <h4>
          <FormattedMessage {...messages.Invoice} />
        </h4>
        <Icon name="zapCircle" className="zap-circle" />
        <SendSats
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
      <div className={`note-invoice flex ${isExpired ? "expired" : ""} ${isPaid ? "paid" : ""}`}>
        <div className="invoice-header">{header()}</div>

        <p className="invoice-amount">
          {amount > 0 && (
            <>
              {(amount / 1_000).toLocaleString()} <span className="sats">sat{amount === 1_000 ? "" : "s"}</span>
            </>
          )}
        </p>

        <div className="invoice-body">
          {description && <p>{description}</p>}
          {isPaid ? (
            <div className="paid">
              <FormattedMessage {...messages.Paid} />
            </div>
          ) : (
            <button disabled={isExpired} type="button" onClick={payInvoice}>
              {isExpired ? <FormattedMessage {...messages.Expired} /> : <FormattedMessage {...messages.Pay} />}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
