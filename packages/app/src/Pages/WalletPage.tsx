import "./WalletPage.css";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FormattedMessage, FormattedNumber, useIntl } from "react-intl";

import NoteTime from "@/Element/Event/NoteTime";
import { WalletInvoice, Sats, WalletInfo, WalletInvoiceState, useWallet, LNWallet, Wallets } from "@/Wallet";
import AsyncButton from "@/Element/Button/AsyncButton";
import { unwrap } from "@/SnortUtils";
import Icon from "@/Icons/Icon";

export default function WalletPage() {
  const navigate = useNavigate();
  const { formatMessage } = useIntl();
  const [info, setInfo] = useState<WalletInfo>();
  const [balance, setBalance] = useState<Sats>();
  const [history, setHistory] = useState<WalletInvoice[]>();
  const [walletPassword, setWalletPassword] = useState<string>();
  const [error, setError] = useState<string>();
  const walletState = useWallet();
  const wallet = walletState.wallet;

  async function loadWallet(wallet: LNWallet) {
    try {
      const i = await wallet.getInfo();
      setInfo(i);
      if (wallet.canGetBalance()) {
        const b = await wallet.getBalance();
        setBalance(b as Sats);
      }
      if (wallet.canGetInvoices()) {
        const h = await wallet.getInvoices();
        setHistory((h as WalletInvoice[]).sort((a, b) => b.timestamp - a.timestamp));
      }
    } catch (e) {
      if (e instanceof Error) {
        setError((e as Error).message);
      } else {
        setError(formatMessage({ defaultMessage: "Unknown error", id: "qDwvZ4" }));
      }
    }
  }

  useEffect(() => {
    if (wallet) {
      if (wallet.isReady()) {
        loadWallet(wallet).catch(console.warn);
      } else if (wallet.canAutoLogin()) {
        wallet
          .login()
          .then(async () => await loadWallet(wallet))
          .catch(console.warn);
      }
    }
  }, [wallet]);

  function stateIcon(s: WalletInvoiceState) {
    switch (s) {
      case WalletInvoiceState.Pending:
        return <Icon name="clock" size={15} />;
      case WalletInvoiceState.Paid:
        return <Icon name="check" size={15} />;
      case WalletInvoiceState.Expired:
        return <Icon name="close" size={15} />;
    }
  }

  async function loginWallet(pw: string) {
    if (wallet) {
      await wallet.login(pw);
      await loadWallet(wallet);
      setWalletPassword(undefined);
    }
  }

  function unlockWallet() {
    if (!wallet || wallet.isReady()) return null;
    return (
      <>
        <h3>
          <FormattedMessage defaultMessage="Enter wallet password" id="r5srDR" />
        </h3>
        <div className="flex w-max">
          <div className="grow mr10">
            <input
              type="password"
              placeholder={formatMessage({
                defaultMessage: "Wallet password",
                id: "MP54GY",
                description: "Wallet password input placeholder",
              })}
              className="w-max"
              value={walletPassword}
              onChange={e => setWalletPassword(e.target.value)}
            />
          </div>
          <AsyncButton onClick={() => loginWallet(unwrap(walletPassword))} disabled={(walletPassword?.length ?? 0) < 8}>
            <FormattedMessage defaultMessage="Unlock" id="xQtL3v" description="Unlock wallet" />
          </AsyncButton>
        </div>
      </>
    );
  }

  function walletList() {
    if (walletState.configs.length === 0) {
      return (
        <button onClick={() => navigate("/settings/wallet")}>
          <FormattedMessage defaultMessage="Connect Wallet" id="cg1VJ2" />
        </button>
      );
    }
    return (
      <div className="flex w-max">
        <h4 className="f-1">
          <FormattedMessage defaultMessage="Select Wallet" id="G1BGCg" />
        </h4>
        <div className="f-1">
          <select className="w-max" onChange={e => Wallets.switch(e.target.value)} value={walletState.config?.id}>
            {Wallets.list().map(a => {
              return <option value={a.id}>{a.info.alias}</option>;
            })}
          </select>
        </div>
      </div>
    );
  }

  function walletHistory() {
    if (!wallet?.canGetInvoices()) return;

    return (
      <>
        <h3>
          <FormattedMessage defaultMessage="History" id="d6CyG5" description="Wallet transation history" />
        </h3>
        {history?.map(a => (
          <div className="card flex wallet-history-item" key={a.timestamp}>
            <div className="grow">
              <NoteTime from={a.timestamp * 1000} fallback={formatMessage({ defaultMessage: "now", id: "kaaf1E" })} />
              <div>{(a.memo ?? "").length === 0 ? <>&nbsp;</> : a.memo}</div>
            </div>
            <div
              className={`flex gap-2 items-center ${(() => {
                switch (a.state) {
                  case WalletInvoiceState.Paid:
                    return "success";
                  case WalletInvoiceState.Expired:
                    return "expired";
                  case WalletInvoiceState.Failed:
                    return "failed";
                  default:
                    return "pending";
                }
              })()}`}>
              <div>{stateIcon(a.state)}</div>
              <div>
                <FormattedMessage
                  defaultMessage="{amount} sats"
                  id="vrTOHJ"
                  values={{
                    amount: <FormattedNumber value={a.amount / 1e3} />,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </>
    );
  }

  function walletBalance() {
    if (!wallet?.canGetBalance()) return;
    return (
      <small>
        <FormattedMessage
          defaultMessage="Balance: {amount} sats"
          id="VN0+Fz"
          values={{
            amount: <FormattedNumber value={balance ?? 0} />,
          }}
        />
      </small>
    );
  }

  function walletInfo() {
    if (!wallet?.isReady()) return;
    return (
      <>
        <div className="p br b">
          <div>{info?.alias}</div>
          {walletBalance()}
        </div>
        {walletHistory()}
      </>
    );
  }

  return (
    <div className="main-content p">
      {walletList()}
      {error && <b className="warning">{error}</b>}
      {unlockWallet()}
      {walletInfo()}
    </div>
  );
}
