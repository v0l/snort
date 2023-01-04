import "./Invoice.css";
import { decode as invoiceDecode } from "light-bolt11-decoder";
import { useMemo } from "react";

export default function Invoice(props) {
    const invoice = props.invoice;

    const info = useMemo(() => {
        try {
            let parsed = invoiceDecode(invoice);

            let amount = parseInt(parsed.sections.find(a => a.name === "amount")?.value);
            return {
                amount: !isNaN(amount) ? (amount / 1000) : null
            }
        } catch (e) {
            console.error(e);
        }
    }, [invoice]);

    return (
        <div className="invoice flex">
            <div className="f-grow">
                ⚡️ Invoice for {info?.amount?.toLocaleString()} sats
            </div>
            <div className="btn" onClick={() => window.open(`lightning:${invoice}`)}>Pay</div>
        </div>
    )
}