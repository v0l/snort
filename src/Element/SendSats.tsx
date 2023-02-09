import "./SendSats.css";
import { useEffect, useMemo, useState } from "react";
import { useIntl, FormattedMessage } from "react-intl";

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
import useHorizontalScroll from "Hooks/useHorizontalScroll";

import messages from "./messages";

interface LNURLService {
  nostrPubkey?: HexKey;
  minSendable?: number;
  maxSendable?: number;
  metadata: string;
  callback: string;
  commentAllowed?: number;
}

interface LNURLInvoice {
  pr: string;
  successAction?: LNURLSuccessAction;
}

interface LNURLSuccessAction {
  description?: string;
  url?: string;
}

export interface LNURLTipProps {
  onClose?: () => void;
  svc?: string;
  show?: boolean;
  invoice?: string; // shortcut to invoice qr tab
  title?: string;
  notice?: string;
  target?: string;
  note?: HexKey;
  author?: HexKey;
}

export default function LNURLTip(props: LNURLTipProps) {
  const onClose = props.onClose || (() => undefined);
  const service = props.svc;
  const show = props.show || false;
  const { note, author, target } = props;
  const amounts = [500, 1_000, 5_000, 10_000, 20_000, 50_000, 100_000, 1_000_000];
  const emojis: Record<number, string> = {
    1_000: "👍",
    5_000: "💜",
    10_000: "😍",
    20_000: "🤩",
    50_000: "🔥",
    100_000: "🚀",
    1_000_000: "🤯",
  };
  const [payService, setPayService] = useState<LNURLService>();
  const [amount, setAmount] = useState<number>(500);
  const [customAmount, setCustomAmount] = useState<number>();
  const [invoice, setInvoice] = useState<LNURLInvoice>();
  const [comment, setComment] = useState<string>();
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<LNURLSuccessAction>();
  const webln = useWebln(show);
  const { formatMessage } = useIntl();
  const publisher = useEventPublisher();
  const horizontalScroll = useHorizontalScroll();
  const canComment = (payService?.commentAllowed ?? 0) > 0 || payService?.nostrPubkey;

  useEffect(() => {
    if (show && !props.invoice) {
      loadService()
        .then(a => setPayService(a ?? undefined))
        .catch(() => setError(formatMessage(messages.LNURLFail)));
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
      const min = (payService.minSendable ?? 0) / 1000;
      const max = (payService.maxSendable ?? 0) / 1000;
      return amounts.filter(a => a >= min && a <= max);
    }
    return [];
  }, [payService]);

  const selectAmount = (a: number) => {
    setError(undefined);
    setInvoice(undefined);
    setAmount(a);
  };

  async function fetchJson<T>(url: string) {
    const rsp = await fetch(url);
    if (rsp.ok) {
      const data: T = await rsp.json();
      console.log(data);
      setError(undefined);
      return data;
    }
    return null;
  }

  async function loadService(): Promise<LNURLService | null> {
    if (service) {
      const isServiceUrl = service.toLowerCase().startsWith("lnurl");
      if (isServiceUrl) {
        const serviceUrl = bech32ToText(service);
        return await fetchJson(serviceUrl);
      } else {
        const ns = service.split("@");
        return await fetchJson(`https://${ns[1]}/.well-known/lnurlp/${ns[0]}`);
      }
    }
    return null;
  }

  async function loadInvoice() {
    if (!amount || !payService) return null;
    let url = "";
    const amountParam = `amount=${Math.floor(amount * 1000)}`;
    const commentParam = comment && payService?.commentAllowed ? `&comment=${encodeURIComponent(comment)}` : "";
    if (payService.nostrPubkey && author) {
      const ev = await publisher.zap(author, note, comment);
      const nostrParam = ev && `&nostr=${encodeURIComponent(JSON.stringify(ev.ToObject()))}`;
      url = `${payService.callback}?${amountParam}${commentParam}${nostrParam}`;
    } else {
      url = `${payService.callback}?${amountParam}${commentParam}`;
    }
    try {
      const rsp = await fetch(url);
      if (rsp.ok) {
        const data = await rsp.json();
        console.log(data);
        if (data.status === "ERROR") {
          setError(data.reason);
        } else {
          setInvoice(data);
          setError("");
          payWebLNIfEnabled(data);
        }
      } else {
        setError(formatMessage(messages.InvoiceFail));
      }
    } catch (e) {
      setError(formatMessage(messages.InvoiceFail));
    }
  }

  function custom() {
    const min = (payService?.minSendable ?? 1000) / 1000;
    const max = (payService?.maxSendable ?? 21_000_000_000) / 1000;
    return (
      <div className="custom-amount flex">
        <input
          type="number"
          min={min}
          max={max}
          className="f-grow mr10"
          placeholder={formatMessage(messages.Custom)}
          value={customAmount}
          onChange={e => setCustomAmount(parseInt(e.target.value))}
        />
        <button
          className="secondary"
          type="button"
          disabled={!customAmount}
          onClick={() => selectAmount(customAmount ?? 0)}>
          <FormattedMessage {...messages.Confirm} />
        </button>
      </div>
    );
  }

  async function payWebLNIfEnabled(invoice: LNURLInvoice) {
    try {
      if (webln?.enabled) {
        const res = await webln.sendPayment(invoice?.pr ?? "");
        console.log(res);
        setSuccess(invoice?.successAction ?? {});
      }
    } catch (e: unknown) {
      console.warn(e);
      if (e instanceof Error) {
        setError(e.toString());
      }
    }
  }

  function invoiceForm() {
    if (invoice) return null;
    return (
      <>
        <h3>
          <FormattedMessage {...messages.ZapAmount} />
        </h3>
        <div className="amounts" ref={horizontalScroll}>
          {serviceAmounts.map(a => (
            <span className={`sat-amount ${amount === a ? "active" : ""}`} key={a} onClick={() => selectAmount(a)}>
              {emojis[a] && <>{emojis[a]}&nbsp;</>}
              {formatShort(a)}
            </span>
          ))}
        </div>
        {payService && custom()}
        <div className="flex">
          {canComment && (
            <input
              type="text"
              placeholder={formatMessage(messages.Comment)}
              className="f-grow"
              maxLength={payService?.commentAllowed || 120}
              onChange={e => setComment(e.target.value)}
            />
          )}
        </div>
        {(amount ?? 0) > 0 && (
          <button type="button" className="zap-action" onClick={() => loadInvoice()}>
            <div className="zap-action-container">
              <Zap />
              {target ? (
                <FormattedMessage {...messages.ZapTarget} values={{ target, n: formatShort(amount) }} />
              ) : (
                <FormattedMessage {...messages.ZapSats} values={{ n: formatShort(amount) }} />
              )}
            </div>
          </button>
        )}
      </>
    );
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
                  <FormattedMessage {...messages.OpenWallet} />
                </button>
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  function successAction() {
    if (!success) return null;
    return (
      <div className="success-action">
        <p className="paid">
          <Check className="success mr10" />
          {success?.description ?? <FormattedMessage {...messages.Paid} />}
        </p>
        {success.url && (
          <p>
            <a href={success.url} rel="noreferrer" target="_blank">
              {success.url}
            </a>
          </p>
        )}
      </div>
    );
  }

  const defaultTitle = payService?.nostrPubkey ? formatMessage(messages.SendZap) : formatMessage(messages.SendSats);
  const title = target
    ? formatMessage(messages.ToTarget, {
        action: defaultTitle,
        target,
      })
    : defaultTitle;
  if (!show) return null;
  return (
    <Modal className="lnurl-modal" onClose={onClose}>
      <div className="lnurl-tip" onClick={e => e.stopPropagation()}>
        <div className="close" onClick={onClose}>
          <Close />
        </div>
        <div className="lnurl-header">
          {author && <ProfileImage pubkey={author} showUsername={false} />}
          <h2>{props.title || title}</h2>
        </div>
        {invoiceForm()}
        {error && <p className="error">{error}</p>}
        {payInvoice()}
        {successAction()}
      </div>
    </Modal>
  );
}
