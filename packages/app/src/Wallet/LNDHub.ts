import { EventPublisher } from "Feed/EventPublisher";
import {
  InvoiceRequest,
  LNWallet,
  Sats,
  UnknownWalletError,
  WalletError,
  WalletInfo,
  WalletInvoice,
  WalletInvoiceState,
} from "Wallet";

const defaultHeaders = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

export default class LNDHubWallet implements LNWallet {
  type: "lndhub" | "snort";
  url: string;
  user: string;
  password: string;
  auth?: AuthResponse;
  publisher?: EventPublisher;

  constructor(url: string, publisher?: EventPublisher) {
    if (url.startsWith("lndhub://")) {
      const regex = /^lndhub:\/\/([\S-]+):([\S-]+)@(.*)$/i;
      const parsedUrl = url.match(regex);
      console.debug(parsedUrl);
      if (!parsedUrl || parsedUrl.length !== 4) {
        throw new Error("Invalid LNDHUB config");
      }
      this.url = new URL(parsedUrl[3]).toString();
      this.user = parsedUrl[1];
      this.password = parsedUrl[2];
      this.type = "lndhub";
    } else if (url.startsWith("snort://")) {
      const u = new URL(url);
      this.url = `https://${u.host}${u.pathname}`;
      this.user = "";
      this.password = "";
      this.type = "snort";
      this.publisher = publisher;
    } else {
      throw new Error("Invalid config");
    }
  }

  close(): Promise<boolean | WalletError> {
    throw new Error("Not implemented");
  }

  async createAccount() {
    return Promise.resolve(UnknownWalletError);
  }

  async getInfo() {
    return await this.getJson<WalletInfo>("GET", "/getinfo");
  }

  async login() {
    if (this.type === "snort") return true;

    const rsp = await this.getJson<AuthResponse>("POST", "/auth?type=auth", {
      login: this.user,
      password: this.password,
    });

    if ("error" in rsp) {
      return rsp as WalletError;
    }
    this.auth = rsp as AuthResponse;
    return true;
  }

  async getBalance(): Promise<Sats | WalletError> {
    const rsp = await this.getJson<GetBalanceResponse>("GET", "/balance");
    if ("error" in rsp) {
      return rsp as WalletError;
    }
    const bal = Math.floor((rsp as GetBalanceResponse).BTC.AvailableBalance);
    return bal as Sats;
  }

  async createInvoice(req: InvoiceRequest) {
    const rsp = await this.getJson<UserInvoicesResponse>("POST", "/addinvoice", {
      amt: req.amount,
      memo: req.memo,
    });
    if ("error" in rsp) {
      return rsp as WalletError;
    }

    const pRsp = rsp as UserInvoicesResponse;
    return {
      pr: pRsp.payment_request,
      memo: req.memo,
      amount: req.amount,
      paymentHash: pRsp.payment_hash,
      timestamp: pRsp.timestamp,
    } as WalletInvoice;
  }

  async payInvoice(pr: string) {
    const rsp = await this.getJson<PayInvoiceResponse>("POST", "/payinvoice", {
      invoice: pr,
    });

    if ("error" in rsp) {
      return rsp as WalletError;
    }

    const pRsp = rsp as PayInvoiceResponse;
    return {
      pr: pr,
      paymentHash: pRsp.payment_hash,
      state: pRsp.payment_error === undefined ? WalletInvoiceState.Paid : WalletInvoiceState.Pending,
    } as WalletInvoice;
  }

  async getInvoices(): Promise<WalletInvoice[] | WalletError> {
    const rsp = await this.getJson<UserInvoicesResponse[]>("GET", "/getuserinvoices");
    if ("error" in rsp) {
      return rsp as WalletError;
    }
    return (rsp as UserInvoicesResponse[]).map(a => {
      return {
        memo: a.description,
        amount: Math.floor(a.amt),
        timestamp: a.timestamp,
        state: a.ispaid ? WalletInvoiceState.Paid : WalletInvoiceState.Pending,
        pr: a.payment_request,
        paymentHash: a.payment_hash,
      } as WalletInvoice;
    });
  }

  private async getJson<T>(method: "GET" | "POST", path: string, body?: any): Promise<T | WalletError> {
    let auth = `Bearer ${this.auth?.access_token}`;
    if (this.type === "snort") {
      const ev = await this.publisher?.generic(`${new URL(this.url).pathname}${path}`, 30_000);
      auth = JSON.stringify(ev?.ToObject());
    }
    const rsp = await fetch(`${this.url}${path}`, {
      method: method,
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        ...defaultHeaders,
        Authorization: auth,
      },
    });
    const json = await rsp.json();
    if ("error" in json) {
      return json as WalletError;
    }
    return json as T;
  }
}

interface AuthResponse {
  refresh_token?: string;
  access_token?: string;
  token_type?: string;
}

interface GetBalanceResponse {
  BTC: {
    AvailableBalance: number;
  };
}

interface UserInvoicesResponse {
  amt: number;
  description: string;
  ispaid: boolean;
  type: string;
  timestamp: number;
  pay_req: string;
  payment_hash: string;
  payment_request: string;
  r_hash: string;
}

interface PayInvoiceResponse {
  payment_error?: string;
  payment_hash: string;
  payment_preimage: string;
  payment_route?: { total_amt: number; total_fees: number };
}
