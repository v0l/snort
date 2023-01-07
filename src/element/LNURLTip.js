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
    const [error, setError] = useState("")

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
                    setInvoice(data.pr);
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

    useEffect(() => {
        if (payService && amount > 0) {
            loadInvoice();
        }
    }, [payService, amount]);

    useEffect(() => {
        if (show) {
            loadService()
                .then(a => setPayService(a))
                .catch(() => setError("Failed to load LNURL service"));
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

    if (!show) return null;
    return (
        <Modal onClose={() => onClose()}>
            <div className="lnurl-tip" onClick={(e) => e.stopPropagation()}>
                <h2>⚡️ Send sats</h2>
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
                {error ? <p className="error">{error}</p> : null}
                <QrCode link={invoice} />
            </div>
        </Modal>
    )
}