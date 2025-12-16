import { barrierQueue, processWorkQueue, unwrap, type WorkQueueItem } from "@snort/shared";

import {
  type InvoiceRequest,
  type LNWallet,
  prToWalletInvoice,
  type Sats,
  WalletError,
  WalletErrorCode,
  type WalletEvents,
  type WalletInfo,
  type WalletInvoice,
  WalletInvoiceState,
} from ".";
import EventEmitter from "eventemitter3";

const WebLNQueue: Array<WorkQueueItem> = [];
processWorkQueue(WebLNQueue);

export class WebLNWallet extends EventEmitter<WalletEvents> implements LNWallet {
  isReady(): boolean {
    return window.webln !== undefined && window.webln !== null;
  }

  canCreateInvoice() {
    return true;
  }

  canPayInvoice() {
    return true;
  }

  canGetInvoices() {
    return false;
  }

  canGetBalance() {
    return window.webln?.getBalance !== undefined;
  }

  canAutoLogin(): boolean {
    return true;
  }

  async getInfo(): Promise<WalletInfo> {
    await this.login();
    if (this.isReady()) {
      const rsp = await barrierQueue(WebLNQueue, async () => await window.webln?.getInfo());
      if (rsp) {
        return {
          nodePubKey: rsp.node.pubkey,
          alias: rsp.node.alias,
        } as WalletInfo;
      } else {
        throw new WalletError(WalletErrorCode.GeneralError, "Could not load wallet info");
      }
    }
    throw new WalletError(WalletErrorCode.GeneralError, "WebLN not available");
  }

  async login(): Promise<boolean> {
    if (window.webln) {
      await window.webln.enable();
    }
    return true;
  }

  close(): Promise<boolean> {
    return Promise.resolve(true);
  }

  async getBalance(): Promise<Sats> {
    await this.login();
    if (window.webln?.getBalance) {
      const rsp = await barrierQueue(WebLNQueue, async () => await unwrap(window.webln?.getBalance).call(window.webln));
      return rsp.balance;
    }
    return 0;
  }

  async createInvoice(req: InvoiceRequest): Promise<WalletInvoice> {
    await this.login();
    if (this.isReady()) {
      const rsp = await barrierQueue(
        WebLNQueue,
        async () =>
          await window.webln?.makeInvoice({
            amount: req.amount,
            defaultMemo: req.memo,
          }),
      );
      if (rsp) {
        const invoice = prToWalletInvoice(rsp.paymentRequest);
        if (!invoice) {
          throw new WalletError(WalletErrorCode.InvalidInvoice, "Could not parse invoice");
        }
        return invoice;
      }
    }
    throw new WalletError(WalletErrorCode.GeneralError, "WebLN not available");
  }

  async payInvoice(pr: string): Promise<WalletInvoice> {
    await this.login();
    if (this.isReady()) {
      const invoice = prToWalletInvoice(pr);
      if (!invoice) {
        throw new WalletError(WalletErrorCode.InvalidInvoice, "Could not parse invoice");
      }
      const rsp = await barrierQueue(WebLNQueue, async () => await window.webln?.sendPayment(pr));
      if (rsp) {
        invoice.state = WalletInvoiceState.Paid;
        invoice.preimage = rsp.preimage;
        invoice.fees = "route" in rsp ? (rsp.route as { total_fees: number }).total_fees : 0;
        return invoice;
      } else {
        invoice.state = WalletInvoiceState.Failed;
        return invoice;
      }
    }
    throw new WalletError(WalletErrorCode.GeneralError, "WebLN not available");
  }

  getInvoices(): Promise<WalletInvoice[]> {
    return Promise.resolve([]);
  }
}
