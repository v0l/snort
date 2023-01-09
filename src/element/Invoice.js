import "./Invoice.css";
import { useState } from "react";
import { decode as invoiceDecode } from "light-bolt11-decoder";
import { useMemo } from "react";
import NoteTime from "./NoteTime";
import QrCode from "./QrCode";

export default function Invoice(props) {
    const invoice = props.invoice;
    const [showLnQr, setShowLnQr] = useState(false);

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
                    { showLnQr ? <p><QrCode data={invoice} link={"lightning:${invoice}"} /></p> : null }
                </>
            )
        } else {
            return (
                <>
                <h4>⚡️ Invoice for {info?.amount?.toLocaleString()} sats</h4>
                { showLnQr ? <p><QrCode data={invoice} link={"lightning:${invoice}"} /></p> : null }
                </>
            )
        }
    }

    function pay(){
        return (
            <>
            { showLnQr ? <div className="btn" onClick={() => window.open(`lightning:${invoice}`)}>Pay</div> :
            <div className="btn" onClick={(e) => setShowLnQr(true)}>Pay</div> }
            </>
        )
    }


    return (
        <div className="note-invoice flex">
            <div className="f-grow flex f-col">
                {header()}
                {info?.expire ? <small>{info?.expired ? "Expired" : "Expires"} <NoteTime from={info.expire * 1000} /></small> : null}
            </div>

            {info?.expired ? <div className="btn">Expired</div>  : pay() }
        </div>
    )
}