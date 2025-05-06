import { decodeInvoice, unwrap } from "@snort/shared";
import AlbyWallet from "./AlbyWallet";
import LNDHubWallet from "./LNDHub";
import { NostrConnectWallet } from "./NostrWalletConnect";
import { WebLNWallet } from "./WebLN";
import EventEmitter from "eventemitter3";

export * from "./zapper";

export const enum WalletKind {
  LNDHub = 1,
  //LNC = 2,
  WebLN = 3,
  NWC = 4,
  //Cashu = 5,
  Alby = 6,
}

export enum WalletErrorCode {
  BadAuth = 1,
  NotEnoughBalance = 2,
  BadPartner = 3,
  InvalidInvoice = 4,
  RouteNotFound = 5,
  GeneralError = 6,
  NodeFailure = 7,
}

export class WalletError extends Error {
  code: WalletErrorCode;

  constructor(c: WalletErrorCode, msg: string) {
    super(msg);
    this.code = c;
  }
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
  amount: Sats;
  memo?: string;
  expiry?: number;
}

export enum WalletInvoiceState {
  Pending = 0,
  Paid = 1,
  Expired = 2,
  Failed = 3,
}

export interface WalletInvoice {
  pr: string;
  paymentHash: string;
  memo: string;
  amount: MilliSats;
  fees: number;
  timestamp: number;
  preimage?: string;
  state: WalletInvoiceState;
  direction: "in" | "out";
}

export function prToWalletInvoice(pr: string) {
  const parsedInvoice = decodeInvoice(pr);
  if (parsedInvoice) {
    return {
      amount: parsedInvoice.amount ?? 0,
      memo: parsedInvoice.description,
      paymentHash: parsedInvoice.paymentHash ?? "",
      timestamp: parsedInvoice.timestamp ?? 0,
      state: parsedInvoice.expired ? WalletInvoiceState.Expired : WalletInvoiceState.Pending,
      pr,
      direction: "in",
    } as WalletInvoice;
  }
}

export type Sats = number;
export type MilliSats = number;

export interface WalletEvents {
  change: (data?: string) => void;
}

export type LNWallet = EventEmitter<WalletEvents> & {
  isReady(): boolean;
  getInfo: () => Promise<WalletInfo>;
  login: (password?: string) => Promise<boolean>;
  close: () => Promise<boolean>;
  getBalance: () => Promise<Sats>;
  createInvoice: (req: InvoiceRequest) => Promise<WalletInvoice>;
  payInvoice: (pr: string) => Promise<WalletInvoice>;
  getInvoices: () => Promise<WalletInvoice[]>;

  canAutoLogin: () => boolean;
  canGetInvoices: () => boolean;
  canGetBalance: () => boolean;
  canCreateInvoice: () => boolean;
  canPayInvoice: () => boolean;
};

/**
 * Load wallet by kind
 *
 * Some wallets are loaded using `async import` to avoid large dependency costs in bundle
 * @param kind The wallet kind to create
 * @param data Opaque data
 */
export async function loadWallet(kind: WalletKind, data: string | undefined) {
  switch (kind) {
    case WalletKind.WebLN: {
      return new WebLNWallet();
    }
    case WalletKind.LNDHub: {
      return new LNDHubWallet(unwrap(data));
    }
    case WalletKind.NWC: {
      return new NostrConnectWallet(unwrap(data));
    }
    case WalletKind.Alby: {
      return new AlbyWallet(JSON.parse(unwrap(data)));
    }
  }
}

export { WebLNWallet, LNDHubWallet, NostrConnectWallet, AlbyWallet };
