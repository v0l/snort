import { InvoiceRequest, LNWallet, WalletInfo, WalletInvoice } from "@/Wallet";
import { CashuMint, Proof } from "@cashu/cashu-ts";

export type CashuWalletConfig = {
  url: string;
  keys: Record<string, string>;
  keysets: Array<string>;
  proofs: Array<Proof>;
};

export class CashuWallet implements LNWallet {
  #wallet: CashuWalletConfig;
  #mint: CashuMint;

  constructor(
    wallet: CashuWalletConfig,
    readonly onChange: (data?: object) => void,
  ) {
    this.#wallet = wallet;
    this.#mint = new CashuMint(this.#wallet.url);
  }

  getConfig() {
    return { ...this.#wallet };
  }

  canGetInvoices() {
    return false;
  }

  canGetBalance() {
    return true;
  }

  canAutoLogin() {
    return true;
  }

  isReady() {
    return true;
  }

  canCreateInvoice() {
    return true;
  }

  canPayInvoice() {
    return true;
  }

  async getInfo() {
    return {
      alias: "Cashu mint: " + this.#wallet.url,
    } as WalletInfo;
  }

  async login(): Promise<boolean> {
    if (this.#wallet.keysets.length === 0) {
      const keys = await this.#mint.getKeys();
      this.#wallet.keys = keys;
      this.#wallet.keysets = [""];
      this.onChange(this.#wallet);
    }
    await this.#checkProofs();
    return true;
  }

  close(): Promise<boolean> {
    return Promise.resolve(true);
  }

  async getBalance() {
    return this.#wallet.proofs.reduce((acc, v) => (acc += v.amount), 0);
  }

  async createInvoice(req: InvoiceRequest) {
    const rsp = await this.#mint.requestMint(req.amount);
    return {
      pr: rsp.pr,
    } as WalletInvoice;
  }

  payInvoice(): Promise<WalletInvoice> {
    throw new Error("Method not implemented.");
  }

  getInvoices(): Promise<WalletInvoice[]> {
    return Promise.resolve([]);
  }

  async #checkProofs() {
    if (this.#wallet.proofs.length == 0) return;

    const checks = await this.#mint.check({
      proofs: this.#wallet.proofs.map(a => ({ secret: a.secret })),
    });

    const filteredProofs = this.#wallet.proofs.filter((_, i) => checks.spendable[i]);
    this.#wallet.proofs = filteredProofs;
    if (filteredProofs.length !== checks.spendable.length) {
      this.onChange(this.#wallet);
    }
  }
}
