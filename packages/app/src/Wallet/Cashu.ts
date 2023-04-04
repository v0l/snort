import {
  InvoiceRequest,
  LNWallet,
  prToWalletInvoice,
  Sats,
  WalletError,
  WalletErrorCode,
  WalletInfo,
  WalletInvoice,
  WalletInvoiceState,
} from "Wallet";

import { CashuMint, CashuWallet as TheCashuWallet, getEncodedToken, Proof } from "@cashu/cashu-ts";

export class CashuWallet implements LNWallet {
  #mint: string;
  #walletPath: string;
  #wallet?: TheCashuWallet;

  constructor(mint: string, path: string) {
    this.#mint = mint;
    this.#walletPath = path;
  }

  isReady(): boolean {
    return this.#wallet !== undefined;
  }

  async getInfo(): Promise<WalletInfo> {
    if (!this.#wallet) {
      throw new WalletError(WalletErrorCode.GeneralError, "Wallet not initialized");
    }
    return {
      nodePubKey: "asd",
      alias: "asd",
    } as WalletInfo;
  }

  async login(_?: string | undefined): Promise<boolean> {
    const m = new CashuMint(this.#mint, this.#walletPath);
    const keys = await m.getKeys();
    this.#wallet = new TheCashuWallet(keys, m);
    return true;
  }

  close(): Promise<boolean> {
    return Promise.resolve(true);
  }

  getBalance(): Promise<Sats> {
    // return dummy balance of 1337 sats
    return Promise.resolve(1337);
  }
  createInvoice(req: InvoiceRequest): Promise<WalletInvoice> {
    throw new Error("Method not implemented.");
  }
  payInvoice(pr: string): Promise<WalletInvoice> {
    throw new Error("Method not implemented.");
  }
  getInvoices(): Promise<WalletInvoice[]> {
    throw new Error("Method not implemented.");
  }
}

interface NutBank {
  proofs: Array<Proof>;
}

export interface NutStashBackup {
  proofs: Array<Proof>;
  mints: [
    {
      mintURL: string;
    }
  ];
}
