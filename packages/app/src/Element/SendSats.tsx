import "./SendSats.css";
import React, { ReactNode, useContext, useEffect, useState } from "react";
import { useIntl, FormattedMessage } from "react-intl";

import { HexKey } from "@snort/system";
import { SnortContext } from "@snort/system-react";
import { LNURLSuccessAction } from "@snort/shared";

import { formatShort } from "Number";
import Icon from "Icons/Icon";
import useEventPublisher from "Hooks/useEventPublisher";
import ProfileImage from "Element/ProfileImage";
import Modal from "Element/Modal";
import QrCode from "Element/QrCode";
import Copy from "Element/Copy";
import { debounce } from "SnortUtils";
import { LNWallet, useWallet } from "Wallet";
import useLogin from "Hooks/useLogin";
import AsyncButton from "Element/AsyncButton";
import { ZapTarget, ZapTargetResult, Zapper } from "Zapper";

import messages from "./messages";

enum ZapType {
  PublicZap = 1,
  AnonZap = 2,
  PrivateZap = 3,
  NonZap = 4,
}

export interface SendSatsProps {
  onClose?: () => void;
  targets?: Array<ZapTarget>;
  show?: boolean;
  invoice?: string; // shortcut to invoice qr tab
  title?: ReactNode;
  notice?: string;
  note?: HexKey;
  allocatePool?: boolean;
}

export default function SendSats(props: SendSatsProps) {
  const onClose = props.onClose || (() => undefined);

  const [zapper, setZapper] = useState<Zapper>();
  const [invoice, setInvoice] = useState<Array<ZapTargetResult>>();
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<LNURLSuccessAction>();
  const [amount, setAmount] = useState<SendSatsInputSelection>();

  const system = useContext(SnortContext);
  const publisher = useEventPublisher();
  const walletState = useWallet();
  const wallet = walletState.wallet;

  useEffect(() => {
    if (props.show) {
      const invoiceTarget = {
        target: {
          type: "lnurl",
          value: "",
          weight: 1,
        },
        pr: props.invoice,
        paid: false,
        sent: 0,
        fee: 0,
      } as ZapTargetResult;

      setError(undefined);
      setInvoice(props.invoice ? [invoiceTarget] : undefined);
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
    if (props.targets && props.show) {
      try {
        console.debug("loading zapper");
        const zapper = new Zapper(system, publisher);
        zapper.load(props.targets).then(() => {
          console.debug(zapper);
          setZapper(zapper);
        });
      } catch (e) {
        console.error(e);
        if (e instanceof Error) {
          setError(e.message);
        }
      }
    }
  }, [props.targets, props.show]);

  function successAction() {
    if (!success) return null;
    return (
      <div className="flex f-center">
        <p className="flex g12">
          <Icon name="check" className="success" />
          {success?.description ?? <FormattedMessage defaultMessage="Paid" />}
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

  function title() {
    if (!props.targets) {
      return (
        <>
          <h2>
            {zapper?.canZap() ? (
              <FormattedMessage defaultMessage="Send zap" />
            ) : (
              <FormattedMessage defaultMessage="Send sats" />
            )}
          </h2>
        </>
      );
    }
    if (props.targets.length === 1 && props.targets[0].name) {
      const t = props.targets[0];
      const values = {
        name: t.name,
      };
      return (
        <>
          {t.zap?.pubkey && <ProfileImage pubkey={t.zap.pubkey} showUsername={false} />}
          <h2>
            {zapper?.canZap() ? (
              <FormattedMessage defaultMessage="Send zap to {name}" values={values} />
            ) : (
              <FormattedMessage defaultMessage="Send sats to {name}" values={values} />
            )}
          </h2>
        </>
      );
    }
    if (props.targets.length > 1) {
      const total = props.targets.reduce((acc, v) => (acc += v.weight), 0);

      return (
        <div className="flex-column g12">
          <h2>
            {zapper?.canZap() ? (
              <FormattedMessage defaultMessage="Send zap splits to" />
            ) : (
              <FormattedMessage defaultMessage="Send sats splits to" />
            )}
          </h2>
          <div className="flex g4 f-wrap">
            {props.targets.map(v => (
              <ProfileImage
                pubkey={v.value}
                showUsername={false}
                showFollowingMark={false}
                imageOverlay={formatShort(Math.floor((amount?.amount ?? 0) * (v.weight / total)))}
              />
            ))}
          </div>
        </div>
      );
    }
  }

  if (!(props.show ?? false)) return null;
  return (
    <Modal id="send-sats" className="lnurl-modal" onClose={onClose}>
      <div className="p flex-column g12">
        <div className="flex g12">
          <div className="flex f-grow">{props.title || title()}</div>
          <div onClick={onClose}>
            <Icon name="close" />
          </div>
        </div>
        {zapper && !invoice && (
          <SendSatsInput
            zapper={zapper}
            onChange={v => setAmount(v)}
            onNextStage={async p => {
              const targetsWithComments = (props.targets ?? []).map(v => {
                if (p.comment) {
                  v.memo = p.comment;
                }
                if (p.type === ZapType.AnonZap && v.zap) {
                  v.zap = {
                    ...v.zap,
                    anon: true,
                  };
                } else if (p.type === ZapType.NonZap) {
                  v.zap = undefined;
                }
                return v;
              });
              if (targetsWithComments.length > 0) {
                const sends = await zapper.send(wallet, targetsWithComments, p.amount);
                if (sends[0].error) {
                  setError(sends[0].error.message);
                } else if (sends.every(a => a.paid)) {
                  setSuccess({});
                } else {
                  setInvoice(sends);
                }
              }
            }}
          />
        )}
        {error && <p className="error">{error}</p>}
        {invoice && !success && (
          <SendSatsInvoice
            invoice={invoice}
            wallet={wallet}
            notice={props.notice}
            onInvoicePaid={() => {
              setSuccess({});
            }}
          />
        )}
        {successAction()}
      </div>
    </Modal>
  );
}

interface SendSatsInputSelection {
  amount: number;
  comment?: string;
  type: ZapType;
}

function SendSatsInput(props: {
  zapper: Zapper;
  onChange?: (v: SendSatsInputSelection) => void;
  onNextStage: (v: SendSatsInputSelection) => Promise<void>;
}) {
  const { defaultZapAmount, readonly } = useLogin(s => ({
    defaultZapAmount: s.preferences.defaultZapAmount,
    readonly: s.readonly,
  }));
  const { formatMessage } = useIntl();
  const amounts: Record<string, string> = {
    [defaultZapAmount.toString()]: "",
    "1000": "👍",
    "5000": "💜",
    "10000": "😍",
    "20000": "🤩",
    "50000": "🔥",
    "100000": "🚀",
    "1000000": "🤯",
  };
  const [comment, setComment] = useState<string>();
  const [amount, setAmount] = useState<number>(defaultZapAmount);
  const [customAmount, setCustomAmount] = useState<number>(defaultZapAmount);
  const [zapType, setZapType] = useState(readonly ? ZapType.AnonZap : ZapType.PublicZap);

  function getValue() {
    return {
      amount,
      comment,
      type: zapType,
    } as SendSatsInputSelection;
  }

  useEffect(() => {
    if (props.onChange) {
      props.onChange(getValue());
    }
  }, [amount, comment, zapType]);

  function renderAmounts() {
    const min = props.zapper.minAmount() / 1000;
    const max = props.zapper.maxAmount() / 1000;
    const filteredAmounts = Object.entries(amounts).filter(([k]) => Number(k) >= min && Number(k) <= max);

    return (
      <div className="amounts">
        {filteredAmounts.map(([k, v]) => (
          <span
            className={`sat-amount ${amount === Number(k) ? "active" : ""}`}
            key={k}
            onClick={() => setAmount(Number(k))}>
            {v}&nbsp;
            {k === "1000" ? "1K" : formatShort(Number(k))}
          </span>
        ))}
      </div>
    );
  }

  function custom() {
    const min = props.zapper.minAmount() / 1000;
    const max = props.zapper.maxAmount() / 1000;

    return (
      <div className="flex g8">
        <input
          type="number"
          min={min}
          max={max}
          className="f-grow"
          placeholder={formatMessage(messages.Custom)}
          value={customAmount}
          onChange={e => setCustomAmount(parseInt(e.target.value))}
        />
        <button
          className="secondary"
          type="button"
          disabled={!customAmount}
          onClick={() => setAmount(customAmount ?? 0)}>
          <FormattedMessage {...messages.Confirm} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex-column g24">
      <div className="flex-column g8">
        <h3>
          <FormattedMessage defaultMessage="Zap amount in sats" />
        </h3>
        {renderAmounts()}
        {custom()}
        {props.zapper.maxComment() > 0 && (
          <input
            type="text"
            placeholder={formatMessage(messages.Comment)}
            className="f-grow"
            maxLength={props.zapper.maxComment()}
            onChange={e => setComment(e.target.value)}
          />
        )}
      </div>
      <SendSatsZapTypeSelector zapType={zapType} setZapType={setZapType} />
      {(amount ?? 0) > 0 && (
        <AsyncButton className="zap-action" onClick={() => props.onNextStage(getValue())}>
          <div className="zap-action-container">
            <Icon name="zap" />
            <FormattedMessage defaultMessage="Zap {n} sats" values={{ n: formatShort(amount) }} />
          </div>
        </AsyncButton>
      )}
    </div>
  );
}

function SendSatsZapTypeSelector({ zapType, setZapType }: { zapType: ZapType; setZapType: (t: ZapType) => void }) {
  const { readonly } = useLogin(s => ({ readonly: s.readonly }));
  const makeTab = (t: ZapType, n: React.ReactNode) => (
    <button type="button" className={zapType === t ? "" : "secondary"} onClick={() => setZapType(t)}>
      {n}
    </button>
  );
  return (
    <div className="flex-column g8">
      <h3>
        <FormattedMessage defaultMessage="Zap Type" />
      </h3>
      <div className="flex g8">
        {!readonly && makeTab(ZapType.PublicZap, <FormattedMessage defaultMessage="Public" description="Public Zap" />)}
        {/*makeTab(ZapType.PrivateZap, "Private")*/}
        {makeTab(ZapType.AnonZap, <FormattedMessage defaultMessage="Anon" description="Anonymous Zap" />)}
        {makeTab(
          ZapType.NonZap,
          <FormattedMessage defaultMessage="Non-Zap" description="Non-Zap, Regular LN payment" />,
        )}
      </div>
    </div>
  );
}

function SendSatsInvoice(props: {
  invoice: Array<ZapTargetResult>;
  wallet?: LNWallet;
  notice?: ReactNode;
  onInvoicePaid: () => void;
}) {
  return (
    <div className="flex-column g12 txt-center">
      {props.notice && <b className="error">{props.notice}</b>}
      {props.invoice.map(v => (
        <>
          <QrCode data={v.pr} link={`lightning:${v.pr}`} />
          <div className="flex-column g12">
            <Copy text={v.pr} maxSize={26} className="f-center" />
            <a href={`lightning:${v.pr}`}>
              <button type="button">
                <FormattedMessage defaultMessage="Open Wallet" />
              </button>
            </a>
          </div>
        </>
      ))}
    </div>
  );
}
