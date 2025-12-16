/* eslint-disable max-lines */
import type { LNWallet, Sats, WalletInvoice } from "@snort/wallet";
import classNames from "classnames";
import { lazy, Suspense, useEffect, useState } from "react";
import { FormattedMessage, FormattedNumber, useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";

import AsyncButton from "@/Components/Button/AsyncButton";
import { AsyncIcon } from "@/Components/Button/AsyncIcon";
import NoteTime from "@/Components/Event/Note/NoteTime";
import Icon from "@/Components/Icons/Icon";
import { useRates } from "@/Hooks/useRates";
import { unwrap } from "@/Utils";
import { useWallet, Wallets } from "@/Wallet";
const PriceChart = lazy(async () => await import("./price-chart"));

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
          <FormattedMessage defaultMessage="Enter wallet password" />
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
            <FormattedMessage defaultMessage="Unlock" />
          </AsyncButton>
        </div>
      </>
    );
  }

  function walletList() {
    if (walletState.configs.length === 0) {
      return (
        <div className="flex flex-col gap-4">
          <div>
            <button onClick={() => navigate("/settings/wallet")}>
              <FormattedMessage defaultMessage="Connect Wallet" />
            </button>
          </div>
          <small>
            <FormattedMessage defaultMessage="Connect a wallet to send instant payments" />
          </small>
        </div>
      );
    }
    return (
      <div className="flex items-center">
        <h4 className="grow">
          <FormattedMessage defaultMessage="Select Wallet" />
        </h4>
        <div>
          <select className="w-max" onChange={e => Wallets.switch(e.target.value)} value={walletState.config?.id}>
            {Wallets.list().map(a => {
              return (
                <option value={a.id} key={a.id}>
                  {a.info.alias}
                </option>
              );
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
          <FormattedMessage defaultMessage="Payments" />
        </h3>
        {history === undefined && (
          <small>
            <FormattedMessage defaultMessage="Your sent and received payments will show up here." />
          </small>
        )}
        {history?.map(a => {
          const dirClassname = {
            "text-[--success]": a.direction === "in",
            "text-[--error]": a.direction === "out",
          };
          return (
            <div className="flex gap-4 p-2 hover:bg-neutral-800 rounded-lg items-center" key={a.timestamp}>
              <div>
                <div className="rounded-full aspect-square p-2 bg-layer-1">
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
                  <div className="text-neutral-400 text-sm">
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
                  <div className="text-neutral-400 text-sm">
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
            small: c => <span className="text-neutral-400 text-sm">{c}</span>,
            amount: <FormattedNumber value={balance ?? 0} />,
          }}
        />
        <AsyncIcon size={20} className="text-neutral-400 cursor-pointer" iconName="closedeye" />
      </div>
    );
  }

  function walletInfo() {
    if (!wallet) return;

    return (
      <>
        <div className="flex flex-col items-center px-6 py-4 bg-layer-1 rounded-lg gap-1">
          {walletBalance()}
          <div className="text-neutral-400">
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
          <div className="flex gap-2">
            {wallet?.canCreateInvoice() && (
              <AsyncButton className="secondary" onClick={() => navigate("/wallet/receive")}>
                <FormattedMessage defaultMessage="Receive" />
                <Icon name="arrow-up-right" className="rotate-180" />
              </AsyncButton>
            )}
            {wallet?.canPayInvoice() && (
              <AsyncButton onClick={() => navigate("/wallet/send")} className="primary">
                <FormattedMessage defaultMessage="Send" />
                <Icon name="arrow-up-right" />
              </AsyncButton>
            )}
          </div>
        </div>
        {walletHistory()}
      </>
    );
  }

  return (
    <div>
      <div className="px-6 py-4 bg-layer-1 rounded-lg mb-4">
        <Suspense>
          <PriceChart />
        </Suspense>
      </div>
      {walletList()}
      {error && <b className="warning">{error}</b>}
      {unlockWallet()}
      {walletInfo()}
    </div>
  );
}
