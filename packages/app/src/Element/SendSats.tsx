import "./SendSats.css";
import React, { useEffect, useMemo, useState } from "react";
import { useIntl, FormattedMessage } from "react-intl";
import { HexKey, RawEvent } from "@snort/nostr";

import { formatShort } from "Number";
import Icon from "Icons/Icon";
import useEventPublisher from "Feed/EventPublisher";
import ProfileImage from "Element/ProfileImage";
import Modal from "Element/Modal";
import QrCode from "Element/QrCode";
import Copy from "Element/Copy";
import { LNURL, LNURLError, LNURLErrorCode, LNURLInvoice, LNURLSuccessAction } from "LNURL";
import { chunks, debounce } from "Util";
import { useWallet } from "Wallet";
import { EventExt } from "System/EventExt";

import messages from "./messages";
import useLogin from "Hooks/useLogin";

enum ZapType {
  PublicZap = 1,
  AnonZap = 2,
  PrivateZap = 3,
  NonZap = 4,
}

export interface SendSatsProps {
  onClose?: () => void;
  lnurl?: string;
  show?: boolean;
  invoice?: string; // shortcut to invoice qr tab
  title?: string;
  notice?: string;
  target?: string;
  note?: HexKey;
  author?: HexKey;
}

export default function SendSats(props: SendSatsProps) {
  const onClose = props.onClose || (() => undefined);
  const { note, author, target } = props;
  const defaultZapAmount = useLogin().preferences.defaultZapAmount;
  const amounts = [defaultZapAmount, 1_000, 5_000, 10_000, 20_000, 50_000, 100_000, 1_000_000];
  const emojis: Record<number, string> = {
    1_000: "👍",
    5_000: "💜",
    10_000: "😍",
    20_000: "🤩",
    50_000: "🔥",
    100_000: "🚀",
    1_000_000: "🤯",
  };

  const [handler, setHandler] = useState<LNURL>();
  const [invoice, setInvoice] = useState<string>();
  const [amount, setAmount] = useState<number>(defaultZapAmount);
  const [customAmount, setCustomAmount] = useState<number>();
  const [comment, setComment] = useState<string>();
  const [success, setSuccess] = useState<LNURLSuccessAction>();
  const [error, setError] = useState<string>();
  const [zapType, setZapType] = useState(ZapType.PublicZap);
  const [paying, setPaying] = useState<boolean>(false);

  const { formatMessage } = useIntl();
  const publisher = useEventPublisher();
  const canComment = handler ? (handler.canZap && zapType !== ZapType.NonZap) || handler.maxCommentLength > 0 : false;
  const walletState = useWallet();
  const wallet = walletState.wallet;

  useEffect(() => {
    if (props.show) {
      setError(undefined);
      setAmount(defaultZapAmount);
      setComment(undefined);
      setZapType(ZapType.PublicZap);
      setInvoice(props.invoice);
      setSuccess(undefined);
    }
  }, [props.show]);

  useEffect(() => {
    if (success && !success.url) {
      // Fire onClose when success is set with no URL action
      return debounce(1_000, () => {
        onClose();
      });
    }
  }, [success]);

  useEffect(() => {
    if (props.lnurl && props.show) {
      try {
        const h = new LNURL(props.lnurl);
        setHandler(h);
        h.load().catch(e => handleLNURLError(e, formatMessage(messages.InvoiceFail)));
      } catch (e) {
        if (e instanceof Error) {
          setError(e.message);
        }
      }
    }
  }, [props.lnurl, props.show]);

  const serviceAmounts = useMemo(() => {
    if (handler) {
      const min = handler.min / 1000;
      const max = handler.max / 1000;
      return amounts.filter(a => a >= min && a <= max);
    }
    return [];
  }, [handler]);
  const amountRows = useMemo(() => chunks(serviceAmounts, 3), [serviceAmounts]);

  const selectAmount = (a: number) => {
    setError(undefined);
    setAmount(a);
  };

  async function loadInvoice() {
    if (!amount || !handler) return null;

    let zap: RawEvent | undefined;
    if (author && zapType !== ZapType.NonZap) {
      const ev = await publisher.zap(amount * 1000, author, note, comment);
      if (ev) {
        // replace sig for anon-zap
        if (zapType === ZapType.AnonZap) {
          const randomKey = publisher.newKey();
          console.debug("Generated new key for zap: ", randomKey);
          ev.pubkey = randomKey.publicKey;
          ev.id = "";
          ev.tags.push(["anon", ""]);
          await EventExt.sign(ev, randomKey.privateKey);
        }
        zap = ev;
      }
    }

    try {
      const rsp = await handler.getInvoice(amount, comment, zap);
      if (rsp.pr) {
        setInvoice(rsp.pr);
        await payWithWallet(rsp);
      }
    } catch (e) {
      handleLNURLError(e, formatMessage(messages.InvoiceFail));
    }
  }

  function handleLNURLError(e: unknown, fallback: string) {
    if (e instanceof LNURLError) {
      switch (e.code) {
        case LNURLErrorCode.ServiceUnavailable: {
          setError(formatMessage(messages.LNURLFail));
          return;
        }
        case LNURLErrorCode.InvalidLNURL: {
          setError(formatMessage(messages.InvalidLNURL));
          return;
        }
      }
    }
    setError(fallback);
  }

  function custom() {
    if (!handler) return null;
    const min = handler.min / 1000;
    const max = handler.max / 1000;

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

  async function payWithWallet(invoice: LNURLInvoice) {
    try {
      if (wallet?.isReady) {
        setPaying(true);
        const res = await wallet.payInvoice(invoice?.pr ?? "");
        console.log(res);
        setSuccess(invoice?.successAction ?? {});
      }
    } catch (e: unknown) {
      console.warn(e);
      if (e instanceof Error) {
        setError(e.toString());
      }
    } finally {
      setPaying(false);
    }
  }

  function renderAmounts(amount: number, amounts: number[]) {
    return (
      <div className="amounts">
        {amounts.map(a => (
          <span className={`sat-amount ${amount === a ? "active" : ""}`} key={a} onClick={() => selectAmount(a)}>
            {emojis[a] && <>{emojis[a]}&nbsp;</>}
            {a === 1000 ? "1K" : formatShort(a)}
          </span>
        ))}
      </div>
    );
  }

  function invoiceForm() {
    if (!handler || invoice) return null;
    return (
      <>
        <h3>
          <FormattedMessage {...messages.ZapAmount} />
        </h3>
        {amountRows.map(amounts => renderAmounts(amount, amounts))}
        {custom()}
        <div className="flex">
          {canComment && (
            <input
              type="text"
              placeholder={formatMessage(messages.Comment)}
              className="f-grow"
              maxLength={handler.canZap && zapType !== ZapType.NonZap ? 250 : handler.maxCommentLength}
              onChange={e => setComment(e.target.value)}
            />
          )}
        </div>
        {zapTypeSelector()}
        {(amount ?? 0) > 0 && (
          <button type="button" className="zap-action" onClick={() => loadInvoice()}>
            <div className="zap-action-container">
              <Icon name="zap" />
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

  function zapTypeSelector() {
    if (!handler || !handler.canZap) return;

    const makeTab = (t: ZapType, n: React.ReactNode) => (
      <div className={`tab${zapType === t ? " active" : ""}`} onClick={() => setZapType(t)}>
        {n}
      </div>
    );
    return (
      <>
        <h3>
          <FormattedMessage defaultMessage="Zap Type" />
        </h3>
        <div className="tabs mt10">
          {makeTab(ZapType.PublicZap, <FormattedMessage defaultMessage="Public" description="Public Zap" />)}
          {/*makeTab(ZapType.PrivateZap, "Private")*/}
          {makeTab(ZapType.AnonZap, <FormattedMessage defaultMessage="Anon" description="Anonymous Zap" />)}
          {makeTab(
            ZapType.NonZap,
            <FormattedMessage defaultMessage="Non-Zap" description="Non-Zap, Regular LN payment" />
          )}
        </div>
      </>
    );
  }

  function payInvoice() {
    if (success || !invoice) return null;
    return (
      <>
        <div className="invoice">
          {props.notice && <b className="error">{props.notice}</b>}
          {paying ? (
            <h4>
              <FormattedMessage
                defaultMessage="Paying with {wallet}"
                values={{
                  wallet: walletState.config?.info.alias,
                }}
              />
              ...
            </h4>
          ) : (
            <QrCode data={invoice} link={`lightning:${invoice}`} />
          )}
          <div className="actions">
            {invoice && (
              <>
                <div className="copy-action">
                  <Copy text={invoice} maxSize={26} />
                </div>
                <button className="wallet-action" type="button" onClick={() => window.open(`lightning:${invoice}`)}>
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
          <Icon name="check" className="success mr10" />
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

  const defaultTitle = handler?.canZap ? formatMessage(messages.SendZap) : formatMessage(messages.SendSats);
  const title = target
    ? formatMessage(messages.ToTarget, {
        action: defaultTitle,
        target,
      })
    : defaultTitle;
  if (!(props.show ?? false)) return null;
  return (
    <Modal className="lnurl-modal" onClose={onClose}>
      <div className="lnurl-tip" onClick={e => e.stopPropagation()}>
        <div className="close" onClick={onClose}>
          <Icon name="close" />
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
