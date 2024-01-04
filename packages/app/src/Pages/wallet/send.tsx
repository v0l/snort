import AsyncButton from "@/Components/Button/AsyncButton";
import Icon from "@/Components/Icons/Icon";
import { WalletInvoice, useWallet } from "@/Wallet";
import { LNURL } from "@snort/shared";
import { useEffect, useState } from "react";
import { FormattedMessage, FormattedNumber, useIntl } from "react-intl";

export function WalletSendPage() {
  const wallets = useWallet();
  const { formatMessage } = useIntl();
  const [invoice, setInvoice] = useState("");
  const [error, setError] = useState("");
  const [lnurl, isLnurl] = useState(true);
  const [amount, setAmount] = useState(0);
  const [comment, setComment] = useState("");
  const [result, setResult] = useState<WalletInvoice>();

  useEffect(() => {
    isLnurl(!invoice.startsWith("lnbc"));
  }, [invoice]);

  return (
    <div className="p flex flex-col gap-4">
      <div className="text-2xl font-bold">
        <FormattedMessage defaultMessage="Send" id="9WRlF4" />
      </div>
      <p>
        <FormattedMessage
          defaultMessage="Sending from <b>{wallet}</b>"
          id="Xnimz0"
          values={{
            b: b => <b>&quot;{b}&quot;</b>,
            wallet: wallets.config?.info.alias,
          }}
        />
      </p>
      <input
        type="text"
        placeholder={formatMessage({ defaultMessage: "Invoice / Lightning Address", id: "EHqHsu" })}
        value={invoice}
        onChange={e => setInvoice(e.target.value)}
      />
      {lnurl && (
        <>
          <input
            type="text"
            placeholder={formatMessage({ defaultMessage: "Comment", id: "LgbKvU" })}
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
          <div className="flex flex-col">
            <small>
              <FormattedMessage defaultMessage="Amount in sats" id="djLctd" />
            </small>
            <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} />
          </div>
        </>
      )}
      <AsyncButton
        onClick={async () => {
          try {
            if (wallets.wallet) {
              if (!isLnurl) {
                const res = await wallets.wallet.payInvoice(invoice);
                setResult(res);
              } else {
                const lnurl = new LNURL(invoice);
                await lnurl.load();
                const pr = await lnurl.getInvoice(amount, comment);
                if (pr.pr) {
                  const res = await wallets.wallet.payInvoice(pr.pr);
                  setResult(res);
                }
              }
            }
          } catch (e) {
            setError((e as Error).message);
          }
        }}>
        <FormattedMessage defaultMessage="Pay" id="lD3+8a" />
      </AsyncButton>
      {error && <b className="warning">{error}</b>}
      {result && (
        <div className="flex gap-2">
          <Icon name="check" className="success" />
          <FormattedMessage
            defaultMessage="Paid {amount} sats, fee {fee} sats"
            id="aRex7h"
            values={{
              amount: <FormattedNumber value={result.amount / 1000} />,
              fee: <FormattedNumber value={result.fees / 1000} />,
            }}
          />
        </div>
      )}
    </div>
  );
}
