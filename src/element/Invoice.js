import "./Invoice.css";
import { useState } from "react";
import { decode as invoiceDecode } from "light-bolt11-decoder";
import { useMemo } from "react";
import NoteTime from "./NoteTime";
import LNURLTip from "./LNURLTip";

export default function Invoice(props) {
    const invoice = props.invoice;
    const [showInvoice, setShowInvoice] = useState(false);

    const info = useMemo(() => {
        try {
            let parsed = invoiceDecode(invoice);

            let amount = parseInt(parsed.sections.find(a => a.name === "amount")?.value);
            let timestamp = parseInt(parsed.sections.find(a => a.name === "timestamp")?.value);
            let expire = parseInt(parsed.sections.find(a => a.name === "expiry")?.value);
            let description = parsed.sections.find(a => a.name === "description")?.value;
            let ret = {
                amount: !isNaN(amount) ? (amount / 1000) : 0,
                expire: !isNaN(timestamp) && !isNaN(expire) ? timestamp + expire : null,
                description
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
                    {showInvoice && <LNURLTip lnInvoice={invoice} show={true} /> }
                </>
            )
        } else {
            return (
                <>
                <h4>⚡️ Invoice for {info?.amount?.toLocaleString()} sats</h4>
                {showInvoice && <LNURLTip lnInvoice={invoice} show={true} /> }
                </>
            )
        }
    }

    return (
        <>
        <div className="note-invoice flex">
            <div className="f-grow flex f-col">
                {header()}
                {info?.expire ? <small>{info?.expired ? "Expired" : "Expires"} <NoteTime from={info.expire * 1000} /></small> : null}
            </div>

            {info?.expired ? <div className="btn">Expired</div>  : <div className="btn" onClick={(e) => setShowInvoice(true)}>Pay</div> }
        </div>

        </>
    )
}