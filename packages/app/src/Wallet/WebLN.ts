import {
  InvoiceRequest,
  LNWallet,
  prToWalletInvoice,
  Sats,
  WalletConfig,
  WalletError,
  WalletErrorCode,
  WalletInfo,
  WalletInvoice,
  WalletInvoiceState,
  WalletKind,
  WalletStore,
} from "Wallet";
import { barrierQueue, processWorkQueue, WorkQueueItem } from "@snort/shared";

const WebLNQueue: Array<WorkQueueItem> = [];
processWorkQueue(WebLNQueue);

/**
 * Adds a wallet config for WebLN if detected
 */
export function setupWebLNWalletConfig(store: WalletStore) {
  const wallets = store.list();
  if (window.webln && !wallets.some(a => a.kind === WalletKind.WebLN)) {
    const newConfig = {
      id: "webln",
      kind: WalletKind.WebLN,
      active: wallets.length === 0,
      info: {
        alias: "WebLN",
      },
    } as WalletConfig;
    store.add(newConfig);
  }
}

export class WebLNWallet implements LNWallet {
  isReady(): boolean {
    return window.webln !== undefined && window.webln !== null;
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

  getBalance(): Promise<Sats> {
    return Promise.resolve(0);
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
          })
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
