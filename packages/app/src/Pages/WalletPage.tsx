import "./WalletPage.css";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FormattedMessage, FormattedNumber, useIntl } from "react-intl";

import NoteTime from "@/Element/Event/NoteTime";
import { WalletInvoice, Sats, useWallet, LNWallet, Wallets } from "@/Wallet";
import AsyncButton from "@/Element/Button/AsyncButton";
import { unwrap } from "@/SnortUtils";
import Icon from "@/Icons/Icon";
import { useRates } from "@/Hooks/useRates";
import { AsyncIcon } from "@/Element/Button/AsyncIcon";
import classNames from "classnames";

export default function WalletPage(props: { showHistory: boolean }) {
  const navigate = useNavigate();
  const { formatMessage } = useIntl();
  const [balance, setBalance] = useState<Sats>();
  const [history, setHistory] = useState<WalletInvoice[]>();
  const [walletPassword, setWalletPassword] = useState<string>();
  const [error, setError] = useState<string>();
  const walletState = useWallet();
  const wallet = walletState.wallet;
  const rates = useRates("BTCUSD");

  async function loadWallet(wallet: LNWallet) {
    try {
      setError(undefined);
      setBalance(0);
      setHistory(undefined);
      if (wallet.canGetBalance()) {
        const b = await wallet.getBalance();
        setBalance(b as Sats);
      }
      if (wallet.canGetInvoices() && (props.showHistory ?? true)) {
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
    if (wallet && wallet.isReady()) {
      loadWallet(wallet).catch(console.warn);
    }
  }, [wallet]);

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
      <div className="flex items-center">
        <h4 className="grow">
          <FormattedMessage defaultMessage="Select Wallet" id="G1BGCg" />
        </h4>
        <div>
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
    if (!wallet?.canGetInvoices() || !(props.showHistory ?? true)) return;

    return (
      <div className="flex flex-col gap-1">
        <h3>
          <FormattedMessage defaultMessage="Payments" id="pukxg/" description="Wallet transation history" />
        </h3>
        {history?.map(a => {
          const dirClassname = {
            "text-[--success]": a.direction === "in",
            "text-[--error]": a.direction === "out",
          };
          return (
            <div className="flex gap-4 p-2 hover:bg-[--gray-superdark] rounded-xl items-center" key={a.timestamp}>
              <div>
                <div className="rounded-full aspect-square p-2 bg-[--gray-dark]">
                  <Icon
                    name="arrow-up-right"
                    className={classNames(dirClassname, {
                      "rotate-180": a.direction === "in",
                    })}
                  />
                </div>
              </div>
              <div className="grow flex justify-between">
                <div className="flex flex-col gap-1">
                  <div>{a.memo?.length === 0 ? CONFIG.appNameCapitalized : a.memo}</div>
                  <div className="text-secondary text-sm">
                    <NoteTime
                      from={a.timestamp * 1000}
                      fallback={formatMessage({ defaultMessage: "now", id: "kaaf1E" })}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <div className={classNames(dirClassname)}>
                    <FormattedMessage
                      defaultMessage="{sign} {amount} sats"
                      id="tj6kdX"
                      values={{
                        sign: a.direction === "in" ? "+" : "-",
                        amount: <FormattedNumber value={a.amount / 1e3} />,
                      }}
                    />
                  </div>
                  <div className="text-secondary text-sm">
                    <FormattedMessage
                      defaultMessage="~{amount}"
                      id="3QwfJR"
                      values={{
                        amount: (
                          <FormattedNumber
                            style="currency"
                            currency="USD"
                            value={(rates?.ask ?? 0) * a.amount * 1e-11}
                          />
                        ),
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function walletBalance() {
    if (!wallet?.canGetBalance()) return;
    return (
      <div className="flex items-center gap-2">
        <FormattedMessage
          defaultMessage="<big>{amount}</big> <small>sats</small>"
          id="E5ZIPD"
          values={{
            big: c => <span className="text-5xl font-bold">{c}</span>,
            small: c => <span className="text-secondary text-sm">{c}</span>,
            amount: <FormattedNumber value={balance ?? 0} />,
          }}
        />
        <AsyncIcon size={20} className="text-secondary cursor-pointer" iconName="closedeye" />
      </div>
    );
  }

  function walletInfo() {
    return (
      <>
        <div className="flex flex-col items-center px-6 py-4 bg-[--gray-superdark] rounded-2xl gap-1">
          {walletBalance()}
          <div className="text-secondary">
            <FormattedMessage
              defaultMessage="~{amount}"
              id="3QwfJR"
              values={{
                amount: (
                  <FormattedNumber style="currency" currency="USD" value={(rates?.ask ?? 0) * (balance ?? 0) * 1e-8} />
                ),
              }}
            />
          </div>
        </div>
        {walletHistory()}
      </>
    );
  }

  return (
    <div className="main-content">
      {walletList()}
      {error && <b className="warning">{error}</b>}
      {unlockWallet()}
      {walletInfo()}
    </div>
  );
}
