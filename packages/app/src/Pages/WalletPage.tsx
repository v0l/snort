import "./WalletPage.css";

import { useEffect, useState } from "react";
import { RouteObject } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faClock, faXmark } from "@fortawesome/free-solid-svg-icons";

import NoteTime from "Element/NoteTime";
import { WalletInvoice, Sats, WalletInfo, WalletInvoiceState, useWallet, LNWallet } from "Wallet";

export const WalletRoutes: RouteObject[] = [
  {
    path: "/wallet",
    element: <WalletPage />,
  },
];

export default function WalletPage() {
  const [info, setInfo] = useState<WalletInfo>();
  const [balance, setBalance] = useState<Sats>();
  const [history, setHistory] = useState<WalletInvoice[]>();
  const wallet = useWallet();

  async function loadWallet(wallet: LNWallet) {
    const i = await wallet.getInfo();
    if ("error" in i) {
      return;
    }
    setInfo(i as WalletInfo);
    const b = await wallet.getBalance();
    setBalance(b as Sats);
    const h = await wallet.getInvoices();
    setHistory((h as WalletInvoice[]).sort((a, b) => b.timestamp - a.timestamp));
  }

  useEffect(() => {
    if (wallet) {
      loadWallet(wallet).catch(console.warn);
    }
  }, [wallet]);

  function stateIcon(s: WalletInvoiceState) {
    switch (s) {
      case WalletInvoiceState.Pending:
        return <FontAwesomeIcon icon={faClock} className="mr5" />;
      case WalletInvoiceState.Paid:
        return <FontAwesomeIcon icon={faCheck} className="mr5" />;
      case WalletInvoiceState.Expired:
        return <FontAwesomeIcon icon={faXmark} className="mr5" />;
    }
  }

  async function createInvoice() {
    if (wallet) {
      const rsp = await wallet.createInvoice({
        memo: "test",
        amount: 100,
      });
      console.debug(rsp);
    }
  }

  return (
    <>
      <h3>{info?.alias}</h3>
      <b>Balance: {(balance ?? 0).toLocaleString()} sats</b>
      <div className="flex wallet-buttons">
        <button>Send</button>
        <button onClick={() => createInvoice()}>Receive</button>
      </div>
      <h3>History</h3>
      {history?.map(a => (
        <div className="card flex wallet-history-item" key={a.timestamp}>
          <div className="f-grow f-col">
            <NoteTime from={a.timestamp * 1000} />
            <div>{(a.memo ?? "").length === 0 ? <>&nbsp;</> : a.memo}</div>
          </div>
          <div className={`${a.state === WalletInvoiceState.Paid ? "success" : "pending"}`}>
            {stateIcon(a.state)}
            {a.amount.toLocaleString()} sats
          </div>
        </div>
      ))}
    </>
  );
}
