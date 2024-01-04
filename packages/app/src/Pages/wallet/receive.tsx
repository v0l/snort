import AsyncButton from "@/Components/Button/AsyncButton";
import Copy from "@/Components/Copy/Copy";
import QrCode from "@/Components/QrCode";
import { useWallet } from "@/Wallet";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

export function WalletReceivePage() {
    const wallets = useWallet();
    const { formatMessage } = useIntl();
    const [invoice, setInvoice] = useState("");
    const [error, setError] = useState("");
    const [amount, setAmount] = useState(0);
    const [comment, setComment] = useState("");

    return <div className="p flex flex-col gap-4">
        <div className="text-2xl font-bold">
            <FormattedMessage defaultMessage="Receive" id="ULXFfP" />
        </div>
        <p>
            <FormattedMessage defaultMessage="Receiving to <b>{wallet}</b>" id="PXQ0z0" values={{
                b: b => <b>&quot;{b}&quot;</b>,
                wallet: wallets.config?.info.alias
            }} />
        </p>
        <input type="text" placeholder={formatMessage({ defaultMessage: "Comment", id: 'LgbKvU' })} value={comment} onChange={e => setComment(e.target.value)} />
        <div className="flex flex-col">
            <small>
                <FormattedMessage defaultMessage="Amount in sats" id="djLctd" />
            </small>
            <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} />
        </div>
        <AsyncButton onClick={async () => {
            try {
                if (wallets.wallet) {
                    const inv = await wallets.wallet.createInvoice({
                        amount: amount,
                        memo: comment,
                        expiry: 600
                    });
                    setInvoice(inv.pr);
                }
            } catch (e) {
                setError((e as Error).message);
            }
        }}>
            <FormattedMessage defaultMessage="Generate Invoice" id="ipHVx5" />
        </AsyncButton>
        {error && <b className="warning">{error}</b>}
        {invoice && <div className="flex flex-col gap-2 items-center">
            <QrCode data={invoice} link={`lightning:${invoice}`} />
            <Copy text={invoice} />
        </div>}
    </div>
}