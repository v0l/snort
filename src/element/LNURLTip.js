import "./LNURLTip.css";
import { useEffect, useMemo, useState } from "react";
import { bech32ToText } from "../Util";
import Modal from "./Modal";
import QrCode from "./QrCode";

export default function LNURLTip(props) {
    const onClose = props.onClose || (() => { });
    const service = props.svc;
    const show = props.show || false;
    const amounts = [50, 100, 500, 1_000, 5_000, 10_000];
    const [payService, setPayService] = useState("");
    const [amount, setAmount] = useState(0);
    const [customAmount, setCustomAmount] = useState(0);
    const [invoice, setInvoice] = useState("");
    const [comment, setComment] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        if (show) {
            loadService()
                .then(a => setPayService(a))
                .catch(() => setError("Failed to load LNURL service"));
        } else {
            setPayService("");
            setError("");
            setInvoice("");
            setAmount(0);
            setComment("");
            setSuccess(null);
        }
    }, [show, service]);

    const serviceAmounts = useMemo(() => {
        if (payService) {
            let min = (payService.minSendable ?? 0) / 1000;
            let max = (payService.maxSendable ?? 0) / 1000;
            return amounts.filter(a => a >= min && a <= max);
        }
        return [];
    }, [payService]);

    const metadata = useMemo(() => {
        if (payService) {
            let meta = JSON.parse(payService.metadata);
            let desc = meta.find(a => a[0] === "text/plain");
            let image = meta.find(a => a[0] === "image/png;base64");
            return {
                description: desc ? desc[1] : null,
                image: image ? image[1] : null
            };
        }
        return null;
    }, [payService]);

    const selectAmount = (a) => {
        setError("");
        setInvoice("");
        setAmount(a);
    };

    async function fetchJson(url) {
        let rsp = await fetch(url);
        if (rsp.ok) {
            let data = await rsp.json();
            console.log(data);
            setError("");
            return data;
        }
        return null;
    }

    async function loadService() {
        let isServiceUrl = service.toLowerCase().startsWith("lnurl");
        if (isServiceUrl) {
            let serviceUrl = bech32ToText(service);
            return await fetchJson(serviceUrl);
        } else {
            let ns = service.split("@");
            return await fetchJson(`https://${ns[1]}/.well-known/lnurlp/${ns[0]}`);
        }
    }

    async function loadInvoice() {
        if (amount === 0) return null;
        const url = `${payService.callback}?amount=${parseInt(amount * 1000)}&comment=${encodeURIComponent(comment)}`;
        try {
            let rsp = await fetch(url);
            if (rsp.ok) {
                let data = await rsp.json();
                console.log(data);
                if (data.status === "ERROR") {
                    setError(data.reason);
                } else {
                    setInvoice(data);
                    setError("");
                }
            } else {
                setError("Failed to load invoice");
            }
        } catch (e) {
            setError("Failed to load invoice");
        }
    };

    function custom() {
        let min = (payService?.minSendable ?? 0) / 1000;
        let max = (payService?.maxSendable ?? 21_000_000_000) / 1000;
        return (
            <div className="flex mb10">
                <input type="number" min={min} max={max} className="f-grow mr10" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} />
                <div className="btn" onClick={() => selectAmount(customAmount)}>Confirm</div>
            </div>
        );
    }

    async function payWebLN() {
        try {
            if (!window.webln.enabled) {
                await window.webln.enable();
            }
            let res = await window.webln.sendPayment(invoice.pr);
            console.log(res);
            setSuccess(invoice.successAction || {});
        } catch (e) {
            setError(e.toString());
            console.warn(e);
        }
    }

    function webLn() {
        if ("webln" in window) {
            return (
                <div className="btn mb10" onClick={() => payWebLN()}>Pay with WebLN</div>
            )
        }
        return null;
    }

    function invoiceForm() {
        if (invoice) return null;
        return (
            <>
                <div className="f-ellipsis mb10">{metadata?.description ?? service}</div>
                <div className="flex">
                    {payService?.commentAllowed > 0 ?
                        <input type="text" placeholder="Comment" className="mb10 f-grow" maxLength={payService?.commentAllowed} onChange={(e) => setComment(e.target.value)} /> : null}
                </div>
                <div className="mb10">
                    {serviceAmounts.map(a => <span className={`pill ${amount === a ? "active" : ""}`} key={a} onClick={() => selectAmount(a)}>
                        {a.toLocaleString()}
                    </span>)}
                    {payService ?
                        <span className={`pill ${amount === -1 ? "active" : ""}`} onClick={() => selectAmount(-1)}>
                            Custom
                        </span> : null}
                </div>
                {amount === -1 ? custom() : null}
                {amount > 0 ? <div className="btn mb10" onClick={() => loadInvoice()}>Get Invoice</div> : null}
            </>
        )
    }

    function payInvoice() {
        if(success) return null;
        const pr = invoice.pr;
        return (
            <>
                <div className="invoice">
                    <div>
                        <QrCode data={pr} link={`lightning:${pr}`} />
                    </div>
                    <div className="actions">
                        {pr ? <>
                            {webLn()}
                            <div className="btn" onClick={() => window.open(`lightning:${pr}`)}>Open Wallet</div>
                            <div className="btn" onClick={() => navigator.clipboard.writeText(pr)}>Copy Invoice</div>
                        </> : null}
                    </div>
                </div>
            </>
        )
    }

    function successAction() {
        if(!success) return null;
        return (
            <>
                <p>{success?.description ?? "Paid!"}</p>
                {success.url ? <a href={success.url} target="_blank">{success.url}</a> : null}
            </>
        )
    }

    if (!show) return null;
    return (
        <Modal onClose={() => onClose()}>
            <div className="lnurl-tip" onClick={(e) => e.stopPropagation()}>
                <h2>⚡️ Send sats</h2>
                {invoiceForm()}
                {error ? <p className="error">{error}</p> : null}
                {payInvoice()}
                {successAction()}
            </div>
        </Modal>
    )
}