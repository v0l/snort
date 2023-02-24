import { InvoiceRequest, LNWallet, Login, WalletError, WalletInfo, WalletInvoice, WalletInvoiceState } from "Wallet";

import LNC from "@lightninglabs/lnc-web";
export class LNCWallet implements LNWallet {
  #lnc: LNC;

  private constructor(pairingPhrase?: string, password?: string) {
    this.#lnc = new LNC({
      pairingPhrase,
      password,
    });
  }

  static async Initialize(pairingPhrase: string, password: string) {
    const lnc = new LNCWallet(pairingPhrase, password);
    await lnc.login();
    return lnc;
  }

  static async Connect(password: string) {
    const lnc = new LNCWallet(undefined, password);
    await lnc.login();
    return lnc;
  }

  createAccount(): Promise<WalletError | Login> {
    throw new Error("Not implemented");
  }

  async getInfo(): Promise<WalletInfo | WalletError> {
    const nodeInfo = await this.#lnc.lnd.lightning.getInfo();
    return {
      nodePubKey: nodeInfo.identityPubkey,
      alias: nodeInfo.alias,
    } as WalletInfo;
  }

  close(): Promise<boolean | WalletError> {
    if (this.#lnc.isConnected) {
      this.#lnc.disconnect();
    }
    return Promise.resolve(true);
  }

  async login(): Promise<boolean | WalletError> {
    await this.#lnc.connect();
    while (!this.#lnc.isConnected) {
      await new Promise(resolve => {
        setTimeout(resolve, 100);
      });
    }
    return true;
  }

  async getBalance(): Promise<number | WalletError> {
    const rsp = await this.#lnc.lnd.lightning.channelBalance();
    console.debug(rsp);
    return parseInt(rsp.localBalance?.sat ?? "0");
  }

  createInvoice(req: InvoiceRequest): Promise<WalletInvoice | WalletError> {
    throw new Error("Not implemented");
  }

  payInvoice(pr: string): Promise<WalletInvoice | WalletError> {
    throw new Error("Not implemented");
  }

  async getInvoices(): Promise<WalletInvoice[] | WalletError> {
    const invoices = await this.#lnc.lnd.lightning.listPayments({
      includeIncomplete: true,
      maxPayments: "10",
      reversed: true,
    });

    return invoices.payments.map(a => {
      return {
        amount: parseInt(a.valueSat),
        state: a.status === "SUCCEEDED" ? WalletInvoiceState.Paid : WalletInvoiceState.Pending,
        timestamp: parseInt(a.creationTimeNs) / 1e9,
      } as WalletInvoice;
    });
  }
}
