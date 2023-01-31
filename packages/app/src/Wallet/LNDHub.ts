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
  url: string;
  user: string;
  password: string;
  auth?: AuthResponse;

  constructor(url: string) {
    const regex = /^lndhub:\/\/([\S-]+):([\S-]+)@(.*)$/i;
    const parsedUrl = url.match(regex);
    if (!parsedUrl || parsedUrl.length !== 4) {
      throw new Error("Invalid LNDHUB config");
    }
    this.url = new URL(parsedUrl[3]).toString();
    this.user = parsedUrl[1];
    this.password = parsedUrl[2];
  }

  async createAccount() {
    return Promise.resolve(UnknownWalletError);
  }

  async getInfo() {
    return await this.getJson<WalletInfo>("GET", "/getinfo");
  }

  async login() {
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
    let rsp = await this.getJson<GetBalanceResponse>("GET", "/balance");
    if ("error" in rsp) {
      return rsp as WalletError;
    }
    let bal = Math.floor((rsp as GetBalanceResponse).BTC.AvailableBalance);
    return bal as Sats;
  }

  async createInvoice(req: InvoiceRequest) {
    return Promise.resolve(UnknownWalletError);
  }

  async payInvoice(pr: string) {
    return Promise.resolve(UnknownWalletError);
  }

  async getInvoices(): Promise<WalletInvoice[] | WalletError> {
    let rsp = await this.getJson<GetUserInvoicesResponse[]>(
      "GET",
      "/getuserinvoices"
    );
    if ("error" in rsp) {
      return rsp as WalletError;
    }
    return (rsp as GetUserInvoicesResponse[]).map((a) => {
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

  private async getJson<T>(
    method: "GET" | "POST",
    path: string,
    body?: any
  ): Promise<T | WalletError> {
    const rsp = await fetch(`${this.url}${path}`, {
      method: method,
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        ...defaultHeaders,
        Authorization: `Bearer ${this.auth?.access_token}`,
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

interface GetUserInvoicesResponse {
  amt: number;
  description: string;
  ispaid: boolean;
  type: string;
  timestamp: number;
  pay_req: string;
  payment_hash: string;
  payment_request: string;
}
