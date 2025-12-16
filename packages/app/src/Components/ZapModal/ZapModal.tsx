import type { LNURLSuccessAction } from "@snort/shared";
import { Zapper, type ZapTarget, type ZapTargetResult } from "@snort/wallet";
import { type ReactNode, useEffect, useState } from "react";

import CloseButton from "@/Components/Button/CloseButton";
import Modal from "@/Components/Modal/Modal";
import { SuccessAction } from "@/Components/ZapModal/SuccessAction";
import { type SendSatsInputSelection, ZapModalInput } from "@/Components/ZapModal/ZapModalInput";
import { ZapModalInvoice } from "@/Components/ZapModal/ZapModalInvoice";
import { ZapModalTitle } from "@/Components/ZapModal/ZapModalTitle";
import { ZapType } from "@/Components/ZapModal/ZapType";
import useEventPublisher from "@/Hooks/useEventPublisher";
import { debounce } from "@/Utils";
import { useWallet } from "@/Wallet";

export interface SendSatsProps {
  onClose?: () => void;
  targets?: Array<ZapTarget>;
  show?: boolean;
  invoice?: string; // shortcut to invoice qr tab
  title?: ReactNode;
  notice?: string;
  allocatePool?: boolean;
}

export default function ZapModal(props: SendSatsProps) {
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
    <Modal id="send-sats" onClose={onClose}>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="flex items-center grow gap-2">
            {props.title || <ZapModalTitle amount={amount} targets={props.targets} zapper={zapper} />}
          </div>
          <CloseButton onClick={onClose} />
        </div>
        {zapper && !invoice && (
          <ZapModalInput
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
          <ZapModalInvoice
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
