import "./Invoice.css";
import { useState } from "react";
// @ts-expect-error
import { decode as invoiceDecode } from "light-bolt11-decoder";
import { useMemo } from "react";
import NoteTime from "Element/NoteTime";
import LNURLTip from "Element/LNURLTip";
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

    function header() {
        if (info?.description?.length > 0) {
            return (
                <>
                    <h4>⚡️ Invoice for {info?.amount?.toLocaleString()} sats</h4>
                    <p>{info?.description}</p>
                    <LNURLTip invoice={invoice} show={showInvoice} onClose={() => setShowInvoice(false)} />
                </>
            )
        } else {
            return (
                <>
                    <h4>⚡️ Invoice for {info?.amount?.toLocaleString()} sats</h4>
                    <LNURLTip invoice={invoice} show={showInvoice} onClose={() => setShowInvoice(false)} />
                </>
            )
        }
    }

    function payInvoice(e: any) {
      e.stopPropagation();
      if (webln?.enabled) {
        try {
          webln.sendPayment(invoice);
        } catch (error) {
          setShowInvoice(true);
        }
      } else {
        setShowInvoice(true);
      }
    }

    return (
        <>
            <div className="note-invoice flex">
                <div className="f-grow flex f-col">
                    {header()}
                    {info?.expire ? <small>{info?.expired ? "Expired" : "Expires"} <NoteTime from={info.expire * 1000} /></small> : null}
                </div>

                {info?.expired ? <div className="btn">Expired</div> : (
                  <button type="button" onClick={payInvoice}>
                    Pay
                  </button>
                )}
            </div>

        </>
    )
}