import type { Zapper } from "@snort/wallet";
import { useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import AsyncButton from "@/Components/Button/AsyncButton";
import Icon from "@/Components/Icons/Icon";
import messages from "@/Components/messages";
import { ZapType } from "@/Components/ZapModal/ZapType";
import { ZapTypeSelector } from "@/Components/ZapModal/ZapTypeSelector";
import useLogin from "@/Hooks/useLogin";
import usePreferences from "@/Hooks/usePreferences";
import { formatShort } from "@/Utils/Number";
import classNames from "classnames";

export interface SendSatsInputSelection {
  amount: number;
  comment?: string;
  type: ZapType;
}

export function ZapModalInput(props: {
  zapper: Zapper;
  onChange?: (v: SendSatsInputSelection) => void;
  onNextStage: (v: SendSatsInputSelection) => Promise<void>;
}) {
  const defaultZapAmount = usePreferences(s => s.defaultZapAmount);
  const readonly = useLogin(s => s.readonly);
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
      <div className="grid grid-cols-4 gap-2">
        {filteredAmounts.map(([k, v]) => {
          return (
            <span
              className={classNames("text-center font-medium py-1 cursor-pointer layer-2-hover rounded-full", {
                "opacity-30": amount !== Number(k),
              })}
              key={k}
              onClick={() => setAmount(Number(k))}>
              {v}&nbsp;
              {k === "1000" ? "1K" : formatShort(Number(k))}
            </span>
          );
        })}
      </div>
    );
  }

  function custom() {
    const min = props.zapper.minAmount() / 1000;
    const max = props.zapper.maxAmount() / 1000;

    return (
      <div className="flex gap-2">
        <input
          type="number"
          min={min}
          max={max}
          className="grow"
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="font-medium">
          <FormattedMessage defaultMessage="Zap amount:" />
        </div>
        {renderAmounts()}
        {custom()}
        {props.zapper.maxComment() > 0 && (
          <>
            <input
              type="text"
              placeholder={formatMessage(messages.Comment)}
              className="grow"
              maxLength={props.zapper.maxComment()}
              onChange={e => setComment(e.target.value)}
            />
          </>
        )}
      </div>
      <ZapTypeSelector zapType={zapType} setZapType={setZapType} />
      {(amount ?? 0) > 0 && (
        <AsyncButton onClick={() => props.onNextStage(getValue())}>
          <Icon name="zap" />
          <FormattedMessage defaultMessage="Zap {n} sats" values={{ n: formatShort(amount) }} />
        </AsyncButton>
      )}
    </div>
  );
}
