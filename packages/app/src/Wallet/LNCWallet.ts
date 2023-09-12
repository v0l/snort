import LNC from "@lightninglabs/lnc-web";
import { unwrap } from "SnortUtils";
import {
  InvoiceRequest,
  LNWallet,
  Login,
  prToWalletInvoice,
  WalletError,
  WalletErrorCode,
  WalletInfo,
  WalletInvoice,
  WalletInvoiceState,
} from "Wallet";
import debug from "debug";

enum Payment_PaymentStatus {
  UNKNOWN = "UNKNOWN",
  IN_FLIGHT = "IN_FLIGHT",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
  UNRECOGNIZED = "UNRECOGNIZED",
}

export class LNCWallet implements LNWallet {
  #lnc: LNC;
  readonly #log = debug("LNC");

  private constructor(pairingPhrase?: string, password?: string) {
    this.#lnc = new LNC({
      pairingPhrase,
      password,
    });
  }

  canAutoLogin(): boolean {
    return false;
  }

  isReady(): boolean {
    return this.#lnc.isReady;
  }

  static async Initialize(pairingPhrase: string) {
    const lnc = new LNCWallet(pairingPhrase);
    await lnc.login();
    return lnc;
  }

  static Empty() {
    return new LNCWallet();
  }

  setPassword(pw: string) {
    if (this.#lnc.credentials.password && pw !== this.#lnc.credentials.password) {
      throw new WalletError(WalletErrorCode.GeneralError, "Password is already set, cannot update password");
    }
    this.#lnc.credentials.password = pw;
  }

  createAccount(): Promise<WalletError | Login> {
    throw new Error("Not implemented");
  }

  async getInfo(): Promise<WalletInfo> {
    const nodeInfo = await this.#lnc.lnd.lightning.getInfo();
    return {
      nodePubKey: nodeInfo.identityPubkey,
      alias: nodeInfo.alias,
    } as WalletInfo;
  }

  close(): Promise<boolean> {
    if (this.#lnc.isConnected) {
      this.#lnc.disconnect();
    }
    return Promise.resolve(true);
  }

  async login(password?: string): Promise<boolean> {
    if (password) {
      this.setPassword(password);
      this.#lnc.run();
    }
    await this.#lnc.connect();
    while (!this.#lnc.isConnected) {
      await new Promise(resolve => {
        setTimeout(resolve, 100);
      });
    }
    return true;
  }

  async getBalance(): Promise<number> {
    const rsp = await this.#lnc.lnd.lightning.channelBalance();
    this.#log(rsp);
    return parseInt(rsp.localBalance?.sat ?? "0");
  }

  async createInvoice(req: InvoiceRequest): Promise<WalletInvoice> {
    const rsp = await this.#lnc.lnd.lightning.addInvoice({
      memo: req.memo,
      value: req.amount.toString(),
      expiry: req.expiry?.toString(),
    });
    return unwrap(prToWalletInvoice(rsp.paymentRequest));
  }

  async payInvoice(pr: string): Promise<WalletInvoice> {
    return new Promise((resolve, reject) => {
      this.#lnc.lnd.router.sendPaymentV2(
        {
          paymentRequest: pr,
          timeoutSeconds: 60,
          feeLimitSat: "100",
        },
        msg => {
          this.#log(msg);
          if (msg.status === Payment_PaymentStatus.SUCCEEDED) {
            resolve({
              preimage: msg.paymentPreimage,
              state: WalletInvoiceState.Paid,
              timestamp: parseInt(msg.creationTimeNs) / 1e9,
            } as WalletInvoice);
          }
        },
        err => {
          this.#log(err);
          reject(err);
        },
      );
    });
  }

  async getInvoices(): Promise<WalletInvoice[]> {
    const invoices = await this.#lnc.lnd.lightning.listPayments({
      maxPayments: "10",
      reversed: true,
    });

    this.#log(invoices);
    return invoices.payments.map(a => {
      const parsedInvoice = prToWalletInvoice(a.paymentRequest);
      if (!parsedInvoice) {
        throw new WalletError(WalletErrorCode.InvalidInvoice, `Could not parse ${a.paymentRequest}`);
      }
      return {
        ...parsedInvoice,
        state: (() => {
          switch (a.status) {
            case Payment_PaymentStatus.SUCCEEDED:
              return WalletInvoiceState.Paid;
            case Payment_PaymentStatus.FAILED:
              return WalletInvoiceState.Failed;
            default:
              return WalletInvoiceState.Pending;
          }
        })(),
        preimage: a.paymentPreimage,
      } as WalletInvoice;
    });
  }
}
