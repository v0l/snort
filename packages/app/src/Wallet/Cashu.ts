import { LNWallet, Sats, WalletError, WalletErrorCode, WalletInfo, WalletInvoice } from "Wallet";
import { CashuMint, CashuWallet as TheCashuWallet, Proof } from "@cashu/cashu-ts";

export class CashuWallet implements LNWallet {
  #mint: string;
  #wallet?: TheCashuWallet;

  constructor(mint: string) {
    this.#mint = mint;
  }

  canAutoLogin(): boolean {
    return true;
  }

  isReady(): boolean {
    return this.#wallet !== undefined;
  }

  async getInfo(): Promise<WalletInfo> {
    if (!this.#wallet) {
      throw new WalletError(WalletErrorCode.GeneralError, "Wallet not initialized");
    }
    return {
      nodePubKey: "asdd",
      alias: "Cashu  mint: " + this.#mint,
    } as WalletInfo;
  }

  async login(): Promise<boolean> {
    const m = new CashuMint(this.#mint);
    const keys = await m.getKeys();
    this.#wallet = new TheCashuWallet(keys, m);
    return true;
  }

  close(): Promise<boolean> {
    return Promise.resolve(true);
  }

  getBalance(): Promise<Sats> {
    throw new Error("Method not implemented.");
  }
  createInvoice(): Promise<WalletInvoice> {
    throw new Error("Method not implemented.");
  }
  payInvoice(): Promise<WalletInvoice> {
    throw new Error("Method not implemented.");
  }
  getInvoices(): Promise<WalletInvoice[]> {
    return Promise.resolve([]);
  }
}

export interface NutStashBackup {
  proofs: Array<Proof>;
  mints: [
    {
      mintURL: string;
    }
  ];
}
