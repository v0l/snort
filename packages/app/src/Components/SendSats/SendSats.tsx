import "./SendSats.css";

import { LNURLSuccessAction } from "@snort/shared";
import { HexKey } from "@snort/system";
import React, { ReactNode, useEffect, useState } from "react";

import CloseButton from "@/Components/Button/CloseButton";
import Modal from "@/Components/Modal/Modal";
import { SendSatsInput, SendSatsInputSelection } from "@/Components/SendSats/SendSatsInput";
import { SendSatsInvoice } from "@/Components/SendSats/SendSatsInvoice";
import { SendSatsTitle } from "@/Components/SendSats/SendSatsTitle";
import { SuccessAction } from "@/Components/SendSats/SuccessAction";
import { ZapType } from "@/Components/SendSats/ZapType";
import useEventPublisher from "@/Hooks/useEventPublisher";
import { debounce } from "@/Utils";
import { Zapper, ZapTarget, ZapTargetResult } from "@/Utils/Zapper";
import { useWallet } from "@/Wallet";

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

  const { publisher, system } = useEventPublisher();
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
        const zapper = new Zapper(system, publisher);
        zapper.load(props.targets).then(() => {
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

  if (!(props.show ?? false)) return null;
  return (
    <Modal id="send-sats" className="lnurl-modal" onClose={onClose}>
      <div className="p flex flex-col g12">
        <div className="flex g12">
          <div className="flex items-center grow">
            {props.title || <SendSatsTitle amount={amount} targets={props.targets} zapper={zapper} />}
          </div>
          <CloseButton onClick={onClose} />
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
        {success && <SuccessAction success={success} />}
      </div>
    </Modal>
  );
}
