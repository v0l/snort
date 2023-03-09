import { CashuMint, CashuWallet as TheCashuWallet, getEncodedProofs, Proof } from "@gandlaf21/cashu-ts";

import { InvoiceRequest, LNWallet, WalletInfo, WalletInvoice } from "Wallet";

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

  getInfo: () => Promise<WalletInfo>;

  async login(_?: string | undefined): Promise<boolean> {
    const m = new CashuMint(this.#mint, this.#walletPath);
    const keys = await m.getKeys();
    this.#wallet = new TheCashuWallet(keys, m);
    return true;
  }

  close: () => Promise<boolean>;
  getBalance: () => Promise<number>;
  createInvoice: (req: InvoiceRequest) => Promise<WalletInvoice>;
  payInvoice: (pr: string) => Promise<WalletInvoice>;
  getInvoices: () => Promise<WalletInvoice[]>;
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
