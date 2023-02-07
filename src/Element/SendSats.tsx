import "./SendSats.css";
import { useEffect, useMemo, useState } from "react";

import { formatShort } from "Number";
import { bech32ToText } from "Util";
import { HexKey } from "Nostr";
import Check from "Icons/Check";
import Zap from "Icons/Zap";
import Close from "Icons/Close";
import useEventPublisher from "Feed/EventPublisher";
import ProfileImage from "Element/ProfileImage";
import Modal from "Element/Modal";
import QrCode from "Element/QrCode";
import Copy from "Element/Copy";
import useWebln from "Hooks/useWebln";

interface LNURLService {
    nostrPubkey?: HexKey
    minSendable?: number,
    maxSendable?: number,
    metadata: string,
    callback: string,
    commentAllowed?: number
}

interface LNURLInvoice {
    pr: string,
    successAction?: LNURLSuccessAction
}

interface LNURLSuccessAction {
    description?: string,
    url?: string
}

export interface LNURLTipProps {
    onClose?: () => void,
    svc?: string,
    show?: boolean,
    invoice?: string, // shortcut to invoice qr tab
    title?: string,
    notice?: string
    target?: string
    note?: HexKey
    author?: HexKey
}

export default function LNURLTip(props: LNURLTipProps) {
    const onClose = props.onClose || (() => { });
    const service = props.svc;
    const show = props.show || false;
    const { note, author, target } = props
    const amounts = [500, 1_000, 5_000, 10_000, 20_000, 50_000, 100_000];
    const emojis: Record<number, string> = {
      1_000: "👍",
      5_000: "💜",
      10_000: "😍",
      20_000: "🤩",
      50_000: "🔥",
      100_000: "🚀",
    }
    const [payService, setPayService] = useState<LNURLService>();
    const [amount, setAmount] = useState<number>(500);
    const [customAmount, setCustomAmount] = useState<number>();
    const [invoice, setInvoice] = useState<LNURLInvoice>();
    const [comment, setComment] = useState<string>();
    const [error, setError] = useState<string>();
    const [success, setSuccess] = useState<LNURLSuccessAction>();
    const webln = useWebln(show);
    const publisher = useEventPublisher();

    useEffect(() => {
        if (show && !props.invoice) {
            loadService()
                .then(a => setPayService(a!))
                .catch(() => setError("Failed to load LNURL service"));
        } else {
            setPayService(undefined);
            setError(undefined);
            setInvoice(props.invoice ? { pr: props.invoice } : undefined);
            setAmount(500);
            setComment(undefined);
            setSuccess(undefined);
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
            let meta: string[][] = JSON.parse(payService.metadata);
            let desc = meta.find(a => a[0] === "text/plain");
            let image = meta.find(a => a[0] === "image/png;base64");
            return {
                description: desc ? desc[1] : null,
                image: image ? image[1] : null
            };
        }
        return null;
    }, [payService]);

    const selectAmount = (a: number) => {
        setError(undefined);
        setInvoice(undefined);
        setAmount(a);
    };

    async function fetchJson<T>(url: string) {
        let rsp = await fetch(url);
        if (rsp.ok) {
            let data: T = await rsp.json();
            console.log(data);
            setError(undefined);
            return data;
        }
        return null;
    }

    async function loadService(): Promise<LNURLService | null> {
        if (service) {
            let isServiceUrl = service.toLowerCase().startsWith("lnurl");
            if (isServiceUrl) {
                let serviceUrl = bech32ToText(service);
                return await fetchJson(serviceUrl);
            } else {
                let ns = service.split("@");
                return await fetchJson(`https://${ns[1]}/.well-known/lnurlp/${ns[0]}`);
            }
        }
        return null;
    }

    async function loadInvoice() {
        if (!amount || !payService) return null;
        let url = ''
        const amountParam = `amount=${Math.floor(amount * 1000)}`
        const commentParam = comment ? `&comment=${encodeURIComponent(comment)}` : ""
        if (payService.nostrPubkey && author) {
            const ev = await publisher.zap(author, note, comment)
            const nostrParam = ev && `&nostr=${encodeURIComponent(JSON.stringify(ev.ToObject()))}`
            url = `${payService.callback}?${amountParam}${commentParam}${nostrParam}`;
        } else {
            url = `${payService.callback}?${amountParam}${commentParam}`;
        }
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
                    payWebLNIfEnabled(data);
                }
            } else {
                setError("Failed to load invoice");
            }
        } catch (e) {
            setError("Failed to load invoice");
        }
    };

    function custom() {
        let min = (payService?.minSendable ?? 1000) / 1000;
        let max = (payService?.maxSendable ?? 21_000_000_000) / 1000;
        return (
            <div className="custom-amount flex">
                <input
                  type="number"
                  min={min}
                  max={max}
                  className="f-grow mr10"
                  placeholder="Custom"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(parseInt(e.target.value))}
                />
                <button
                  className="secondary"
                  type="button"
                  disabled={!Boolean(customAmount)}
                  onClick={() => selectAmount(customAmount!)}
                >
                  Confirm
                </button>
            </div>
        );
    }

    async function payWebLNIfEnabled(invoice: LNURLInvoice) {
        try {
            if (webln?.enabled) {
                let res = await webln.sendPayment(invoice!.pr);
                console.log(res);
                setSuccess(invoice!.successAction || {});
            }
        } catch (e: any) {
            setError(e.toString());
            console.warn(e);
        }
    }

    function invoiceForm() {
        if (invoice) return null;
        return (
            <>
                <h3>Zap amount in sats</h3>
                <div className="amounts">
                  {serviceAmounts.map(a => 
                    <span className={`sat-amount ${amount === a ? "active" : ""}`} key={a} onClick={() => selectAmount(a)}>
                      {emojis[a] && <>{emojis[a]}&nbsp;</> }
                      {formatShort(a)}
                    </span>
                  )}
                </div>
                {payService && custom()}
                <div className="flex">
                    {(payService?.commentAllowed ?? 0) > 0 &&
                        <input
                          type="text" 
                          placeholder="Comment"
                          className="f-grow"
                          maxLength={payService?.commentAllowed}
                          onChange={(e) => setComment(e.target.value)}
                        />
                    }
                </div>
                {(amount ?? 0) > 0 && (
                  <button type="button" className="zap-action" onClick={() => loadInvoice()}>
                    <div className="zap-action-container">
                     <Zap /> Zap
                      {target && ` ${target} `}
                      {formatShort(amount)} sats
                    </div>
                  </button>
                )}
            </>
        )
    }

    function payInvoice() {
        if (success) return null;
        const pr = invoice?.pr;
        return (
            <>
                <div className="invoice">
                  {props.notice && <b className="error">{props.notice}</b>}
                  <QrCode data={pr} link={`lightning:${pr}`} />
                  <div className="actions">
                      {pr && (
                          <>
                            <div className="copy-action">
                                <Copy text={pr} maxSize={26} />
                            </div>
                            <button className="wallet-action" type="button" onClick={() => window.open(`lightning:${pr}`)}>
                                Open Wallet
                            </button>
                        </>
                      )}
                  </div>
                </div>
            </>
        )
    }

    function successAction() {
        if (!success) return null;
        return (
            <div className="success-action">
                <p className="paid">
                  <Check className="success mr10" />
                  {success?.description ?? "Paid!"}
                </p>
                {success.url && 
                  <p>
                    <a 
                      href={success.url}
                      rel="noreferrer"
                      target="_blank"
                      >
                      {success.url}
                    </a>
                  </p>
                }
            </div>
        )
    }

    const defaultTitle = payService?.nostrPubkey ? "Send zap" : "Send sats";
    const title = target ? `${defaultTitle} to ${target}` : defaultTitle
    if (!show) return null;
    return (
        <Modal className="lnurl-modal" onClose={onClose}>
          <div className="lnurl-tip" onClick={(e) => e.stopPropagation()}>
              <div className="close" onClick={onClose}>
                <Close />
              </div>
              <div className="lnurl-header">
                {author && <ProfileImage pubkey={author} showUsername={false} />}
                <h2>
                  {props.title || title}
                </h2>
              </div>
              {invoiceForm()}
              {error && <p className="error">{error}</p>}
              {payInvoice()}
              {successAction()}
          </div>
        </Modal>
    )
}
