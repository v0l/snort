import useEventPublisher, { EventPublisher } from "Feed/EventPublisher";
import { useEffect, useState } from "react";
import LNDHubWallet from "./LNDHub";

export enum WalletErrorCode {
  BadAuth = 1,
  NotEnoughBalance = 2,
  BadPartner = 3,
  InvalidInvoice = 4,
  RouteNotFound = 5,
  GeneralError = 6,
  NodeFailure = 7,
}

export interface WalletError {
  code: WalletErrorCode;
  message: string;
}

export const UnknownWalletError = {
  code: WalletErrorCode.GeneralError,
  message: "Unknown error",
} as WalletError;

export interface WalletInfo {
  fee: number;
  nodePubKey: string;
  alias: string;
  pendingChannels: number;
  activeChannels: number;
  peers: number;
  blockHeight: number;
  blockHash: string;
  synced: boolean;
  chains: string[];
  version: string;
}

export interface Login {
  service: string;
  save: () => Promise<void>;
  load: () => Promise<void>;
}

export interface InvoiceRequest {
  amount: number;
  memo?: string;
  expiry?: number;
}

export enum WalletInvoiceState {
  Pending = 0,
  Paid = 1,
  Expired = 2,
}

export interface WalletInvoice {
  pr: string;
  paymentHash: string;
  memo: string;
  amount: number;
  fees: number;
  timestamp: number;
  state: WalletInvoiceState;
}

export type Sats = number;

export interface LNWallet {
  createAccount: () => Promise<Login | WalletError>;
  getInfo: () => Promise<WalletInfo | WalletError>;
  login: () => Promise<boolean | WalletError>;
  getBalance: () => Promise<Sats | WalletError>;
  createInvoice: (req: InvoiceRequest) => Promise<WalletInvoice | WalletError>;
  payInvoice: (pr: string) => Promise<WalletInvoice | WalletError>;
  getInvoices: () => Promise<WalletInvoice[] | WalletError>;
}

export async function openWallet(config: string, publisher?: EventPublisher) {
  const wallet = new LNDHubWallet(config, publisher);
  await wallet.login();
  return wallet;
}

export function useWallet() {
  const [wallet, setWallet] = useState<LNWallet>();
  const publisher = useEventPublisher();

  useEffect(() => {
    if (publisher) {
      const cfg = window.localStorage.getItem("wallet-lndhub");
      if (cfg) {
        openWallet(cfg, publisher)
          .then(a => setWallet(a))
          .catch(console.error);
      }
    }
  }, [publisher]);

  return wallet;
}
