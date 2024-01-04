import { unixNow, unwrap } from "@snort/shared";

import { OAuthToken } from "@/Pages/settings/wallet/Alby";

import {
  InvoiceRequest,
  LNWallet,
  prToWalletInvoice,
  WalletError,
  WalletErrorCode,
  WalletInfo,
  WalletInvoice,
  WalletInvoiceState,
} from ".";
import { base64 } from "@scure/base";

export default class AlbyWallet implements LNWallet {
  #token: OAuthToken;
  constructor(
    token: OAuthToken,
    readonly onChange: (data?: object) => void,
  ) {
    this.#token = token;
  }

  isReady() {
    return true;
  }

  canAutoLogin() {
    return true;
  }

  canGetInvoices() {
    return this.#token.scope.includes("invoices:read");
  }

  canGetBalance() {
    return this.#token.scope.includes("balance:read");
  }

  canCreateInvoice() {
    return true;
  }

  canPayInvoice() {
    return true;
  }

  async getInfo() {
    const me = await this.#fetch<GetUserResponse>("/user/me");
    return { alias: me.lightning_address } as WalletInfo;
  }

  async login() {
    await this.#refreshToken();
    return true;
  }

  close() {
    return Promise.resolve(true);
  }

  async getBalance() {
    const bal = await this.#fetch<GetBalanceResponse>("/balance");
    return bal.balance;
  }

  async createInvoice(req: InvoiceRequest) {
    const inv = await this.#fetch<CreateInvoiceResponse>("/invoices", "POST", {
      amount: req.amount,
      memo: req.memo,
    });

    return unwrap(prToWalletInvoice(inv.payment_request));
  }

  async payInvoice(pr: string) {
    const pay = await this.#fetch<PayInvoiceResponse>("/payments/bolt11", "POST", {
      invoice: pr,
    });

    return {
      ...prToWalletInvoice(pay.payment_request),
      fees: pay.fee,
      preimage: pay.payment_preimage,
      state: WalletInvoiceState.Paid,
      direction: "out",
    } as WalletInvoice;
  }

  async getInvoices() {
    const invoices = await this.#fetch<Array<GetInvoiceResponse>>("/invoices?page=1&items=20");
    return invoices.map(a => {
      return {
        ...prToWalletInvoice(a.payment_request),
        memo: a.comment,
        preimage: a.preimage,
        state: a.settled ? WalletInvoiceState.Paid : WalletInvoiceState.Pending,
        direction: a.type === "incoming" ? "in" : "out",
      } as WalletInvoice;
    });
  }

  async #fetch<T>(path: string, method: "GET" | "POST" = "GET", body?: object) {
    const req = await fetch(`https://api.getalby.com${path}`, {
      method: method,
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        accept: "application/json",
        authorization: `Bearer ${this.#token.access_token}`,
        ...(body ? { "content-type": "application/json" } : {}),
      },
    });
    const json = await req.text();
    if (req.ok) {
      return JSON.parse(json) as T;
    } else {
      if (json.length > 0) {
        throw new WalletError(WalletErrorCode.GeneralError, JSON.parse(json).message as string);
      } else {
        throw new WalletError(WalletErrorCode.GeneralError, `Error: ${json} (${req.status})`);
      }
    }
  }
  async #refreshToken() {
    if (this.#token.created_at + this.#token.expires_in < unixNow()) {
      // refresh
      const params = new URLSearchParams();
      params.set("refresh_token", this.#token.refresh_token);
      params.set("grant_type", "refresh_token");

      const req = await fetch("https://api.getalby.com/oauth/token", {
        method: "POST",
        body: params,
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded",
          authorization: `Basic ${base64.encode(
            new TextEncoder().encode(`${CONFIG.alby?.clientId}:${CONFIG.alby?.clientSecret}`),
          )}`,
        },
      });
      const json = await req.json();
      if (req.ok) {
        this.#token = json as OAuthToken;
        this.onChange(this.#token);
      }
    }
  }
}

interface GetBalanceResponse {
  balance: number;
  currency: string;
  unit: string;
}

interface CreateInvoiceResponse {
  expires_at: string;
  payment_hash: string;
  payment_request: string;
}

interface PayInvoiceResponse {
  amount: number;
  description?: string;
  destination: string;
  fee: number;
  payment_hash: string;
  payment_preimage: string;
  payment_request: string;
}

interface GetInvoiceResponse {
  amount: number;
  comment?: string;
  created_at: string;
  creation_date: number;
  currency: string;
  expires_at: string;
  preimage: string;
  payment_request: string;
  settled: boolean;
  settled_at: string;
  type: "incoming" | "outgoing";
}

interface GetUserResponse {
  lightning_address: string;
}
