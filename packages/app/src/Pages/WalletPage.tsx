import "./WalletPage.css";

import { useEffect, useState } from "react";
import { RouteObject, useNavigate } from "react-router-dom";
import { FormattedMessage, FormattedNumber, useIntl } from "react-intl";

import NoteTime from "Element/NoteTime";
import { WalletInvoice, Sats, WalletInfo, WalletInvoiceState, useWallet, LNWallet, Wallets, WalletKind } from "Wallet";
import AsyncButton from "Element/AsyncButton";
import { unwrap } from "Util";
import { WebLNWallet } from "Wallet/WebLN";
import Icon from "Icons/Icon";

export const WalletRoutes: RouteObject[] = [
  {
    path: "/wallet",
    element: <WalletPage />,
  },
];

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
      const b = await wallet.getBalance();
      setBalance(b as Sats);
      const h = await wallet.getInvoices();
      setHistory((h as WalletInvoice[]).sort((a, b) => b.timestamp - a.timestamp));
    } catch (e) {
      if (e instanceof Error) {
        setError((e as Error).message);
      } else {
        setError(formatMessage({ defaultMessage: "Unknown error" }));
      }
    }
  }

  useEffect(() => {
    if (wallet) {
      if (wallet.isReady()) {
        loadWallet(wallet).catch(console.warn);
      } else if (walletState.config?.kind !== WalletKind.LNC) {
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
        return <Icon name="clock" className="mr5" size={15} />;
      case WalletInvoiceState.Paid:
        return <Icon name="check" className="mr5" size={15} />;
      case WalletInvoiceState.Expired:
        return <Icon name="close" className="mr5" size={15} />;
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
          <FormattedMessage defaultMessage="Enter wallet password" />
        </h3>
        <div className="flex w-max">
          <div className="f-grow mr10">
            <input
              type="password"
              placeholder={formatMessage({
                defaultMessage: "Wallet password",
                description: "Wallet password input placeholder",
              })}
              className="w-max"
              value={walletPassword}
              onChange={e => setWalletPassword(e.target.value)}
            />
          </div>
          <AsyncButton onClick={() => loginWallet(unwrap(walletPassword))} disabled={(walletPassword?.length ?? 0) < 8}>
            <FormattedMessage defaultMessage="Unlock" description="Unlock wallet" />
          </AsyncButton>
        </div>
      </>
    );
  }

  function walletList() {
    if (walletState.configs.length === 0) {
      return (
        <button onClick={() => navigate("/settings/wallet")}>
          <FormattedMessage defaultMessage="Connect Wallet" />
        </button>
      );
    }
    return (
      <div className="flex w-max">
        <h4 className="f-1">
          <FormattedMessage defaultMessage="Select Wallet" />
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
    if (wallet instanceof WebLNWallet) return null;

    return (
      <>
        <h3>
          <FormattedMessage defaultMessage="History" description="Wallet transation history" />
        </h3>
        {history?.map(a => (
          <div className="card flex wallet-history-item" key={a.timestamp}>
            <div className="f-grow f-col">
              <NoteTime from={a.timestamp * 1000} fallback={formatMessage({ defaultMessage: "now" })} />
              <div>{(a.memo ?? "").length === 0 ? <>&nbsp;</> : a.memo}</div>
            </div>
            <div
              className={`nowrap ${(() => {
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
              {stateIcon(a.state)}
              <FormattedMessage
                defaultMessage="{amount} sats"
                values={{
                  amount: <FormattedNumber value={a.amount / 1e3} />,
                }}
              />
            </div>
          </div>
        ))}
      </>
    );
  }

  function walletBalance() {
    if (wallet instanceof WebLNWallet) return null;
    return (
      <small>
        <FormattedMessage
          defaultMessage="Balance: {amount} sats"
          values={{
            amount: <FormattedNumber value={balance ?? 0} />,
          }}
        />
      </small>
    );
  }

  function walletInfo() {
    if (!wallet?.isReady()) return null;
    return (
      <>
        <div className="card">
          <h3>{info?.alias}</h3>
          {walletBalance()}
        </div>
        {/*<div className="flex wallet-buttons">
          <AsyncButton onClick={createInvoice}>
            <FormattedMessage defaultMessage="Receive" description="Receive sats by generating LN invoice" />
          </AsyncButton>
        </div>*/}
        {walletHistory()}
      </>
    );
  }

  return (
    <div className="main-content">
      {error && <b className="error">{error}</b>}
      {walletList()}
      {unlockWallet()}
      {walletInfo()}

      <button onClick={() => Wallets.remove(unwrap(walletState.config).id)}>
        <FormattedMessage defaultMessage="Delete Account" />
      </button>
    </div>
  );
}
