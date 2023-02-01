import "./Invoice.css";
import { useState } from "react";
// @ts-expect-error
import { decode as invoiceDecode } from "light-bolt11-decoder";
import { useMemo } from "react";
import NoteTime from "Element/NoteTime";
import LNURLTip from "Element/LNURLTip";
import ZapCircle from "Icons/ZapCircle";
import useWebln from "Hooks/useWebln";

export interface InvoiceProps {
    invoice: string
}
export default function Invoice(props: InvoiceProps) {
    const invoice = props.invoice;
    const webln = useWebln();
    const [showInvoice, setShowInvoice] = useState(false);

    const info = useMemo(() => {
        try {
            let parsed = invoiceDecode(invoice);

            let amount = parseInt(parsed.sections.find((a: any) => a.name === "amount")?.value);
            let timestamp = parseInt(parsed.sections.find((a: any) => a.name === "timestamp")?.value);
            let expire = parseInt(parsed.sections.find((a: any) => a.name === "expiry")?.value);
            let description = parsed.sections.find((a: any) => a.name === "description")?.value;
            let ret = {
                amount: !isNaN(amount) ? (amount / 1000) : 0,
                expire: !isNaN(timestamp) && !isNaN(expire) ? timestamp + expire : null,
                description,
                expired: false
            };
            if (ret.expire) {
                ret.expired = ret.expire < (new Date().getTime() / 1000);
            }
            return ret;
        } catch (e) {
            console.error(e);
        }
    }, [invoice]);

    const [isPaid, setIsPaid] = useState(false);
    const isExpired = info?.expired
    const amount = info?.amount ?? 0
    const description = info?.description

    function header() {
      return (
          <>
              <h4>Lightning Invoice</h4>
              <ZapCircle className="zap-circle" />
              <LNURLTip invoice={invoice} show={showInvoice} onClose={() => setShowInvoice(false)} />
          </>
      )
    }

    async function payInvoice(e: any) {
      e.stopPropagation();
      if (webln?.enabled) {
        try {
          await webln.sendPayment(invoice);
          setIsPaid(true)
        } catch (error) {
          setShowInvoice(true);
        }
      } else {
        setShowInvoice(true);
      }
    }

    return (
        <>
          <div className={`note-invoice flex ${isExpired ? 'expired' : ''} ${isPaid ? 'paid' : ''}`}>
            <div className="invoice-header">
              {header()}
            </div>

            <p className="invoice-amount">
              {amount > 0 && (
                <>
                 {amount.toLocaleString()} <span className="sats">sat{amount === 1 ? '' : 's'}</span>
                </>
              )}
            </p>

            <div className="invoice-body">
              {description && <p>{description}</p>}
              {isPaid ? (
                <div className="paid">
                  Paid
                </div>
              ) : (
                <button disabled={isExpired} type="button" onClick={payInvoice}>
                  {isExpired ? "Expired" : "Pay"}
                </button>
              )}
            </div>

            </div>

        </>
    )
}
