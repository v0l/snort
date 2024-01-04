import { dedupe } from "@snort/shared";
import { Connection, EventBuilder, EventKind, NostrEvent, PrivateKeySigner } from "@snort/system";
import debug from "debug";

import {
  InvoiceRequest,
  LNWallet,
  WalletError,
  WalletErrorCode,
  WalletInfo,
  WalletInvoice,
  WalletInvoiceState,
} from "@/Wallet";

interface WalletConnectConfig {
  relayUrl: string;
  walletPubkey: string;
  secret: string;
}

interface QueueObj {
  resolve: (o: string) => void;
  reject: (e: Error) => void;
}

interface WalletConnectResponse<T> {
  result_type?: string;
  result?: T;
  error?: {
    code:
      | "RATE_LIMITED"
      | "NOT_IMPLEMENTED"
      | "INSUFFICIENT_BALANCE"
      | "QUOTA_EXCEEDED"
      | "RESTRICTED"
      | "UNAUTHORIZED"
      | "INTERNAL"
      | "OTHER";
    message: string;
  };
}

interface GetInfoResponse {
  alias?: string;
  color?: string;
  pubkey?: string;
  network?: string;
  block_height?: number;
  block_hash?: string;
  methods?: Array<string>;
}

interface ListTransactionsResponse {
  transactions: Array<{
    type: "incoming" | "outgoing";
    invoice: string;
    description?: string;
    description_hash?: string;
    preimage?: string;
    payment_hash?: string;
    amount: number;
    feed_paid: number;
    settled_at?: number;
    created_at: number;
    expires_at: number;
    metadata?: object;
  }>;
}

interface MakeInvoiceResponse {
  invoice: string;
  payment_hash: string;
}

const DefaultSupported = ["get_info", "pay_invoice"];

export class NostrConnectWallet implements LNWallet {
  #log = debug("NWC");
  #config: WalletConnectConfig;
  #conn?: Connection;
  #commandQueue: Map<string, QueueObj>;
  #info?: WalletInfo;
  #supported_methods: Array<string> = DefaultSupported;

  constructor(
    cfg: string,
    readonly changed: (data?: object) => void,
  ) {
    this.#config = NostrConnectWallet.parseConfigUrl(cfg);
    this.#commandQueue = new Map();
  }

  static parseConfigUrl(url: string) {
    const uri = new URL(url.replace("nostrwalletconnect://", "http://").replace("nostr+walletconnect://", "http://"));
    return {
      relayUrl: uri.searchParams.get("relay"),
      walletPubkey: uri.host,
      secret: uri.searchParams.get("secret"),
    } as WalletConnectConfig;
  }

  canAutoLogin(): boolean {
    return true;
  }

  isReady(): boolean {
    return this.#conn !== undefined;
  }

  canGetInvoices() {
    return this.#supported_methods.includes("list_transactions");
  }

  canGetBalance() {
    return this.#supported_methods.includes("get_balance");
  }

  canCreateInvoice() {
    return this.#supported_methods.includes("make_invoice");
  }

  canPayInvoice() {
    return this.#supported_methods.includes("pay_invoice");
  }

  async getInfo() {
    await this.login();
    if (this.#info) return this.#info;

    const rsp = await this.#rpc<WalletConnectResponse<GetInfoResponse>>("get_info", {});
    if (!rsp.error) {
      this.#supported_methods = dedupe(["get_info", ...(rsp.result?.methods ?? DefaultSupported)]);
      this.#log("Supported methods: %o", this.#supported_methods);
      const info = {
        nodePubKey: rsp.result?.pubkey,
        alias: rsp.result?.alias,
        blockHeight: rsp.result?.block_height,
        blockHash: rsp.result?.block_hash,
        chains: rsp.result?.network ? [rsp.result.network] : undefined,
      } as WalletInfo;
      this.#info = info;
      return info;
    } else if (rsp.error.code === "NOT_IMPLEMENTED") {
      // legacy get_info uses event kind 13_194
      return await new Promise<WalletInfo>((resolve, reject) => {
        this.#commandQueue.set("info", {
          resolve: (o: string) => {
            this.#supported_methods = dedupe(["get_info", ...o.split(",")]);
            this.#log("Supported methods: %o", this.#supported_methods);
            const info = {
              alias: "NWC",
            } as WalletInfo;
            this.#info = info;
            resolve(info);
          },
          reject,
        });
        this.#conn?.QueueReq(["REQ", "info", { kinds: [13194], limit: 1 }], () => {
          // ignored
        });
      });
    } else {
      throw new WalletError(WalletErrorCode.GeneralError, rsp.error.message);
    }
  }

  async login() {
    if (this.#conn) return true;

    await new Promise<void>(resolve => {
      this.#conn = new Connection(this.#config.relayUrl, { read: true, write: true });
      this.#conn.on("connected", () => resolve());
      this.#conn.on("auth", async (c, r, cb) => {
        const eb = new EventBuilder();
        eb.kind(EventKind.Auth).tag(["relay", r]).tag(["challenge", c]);
        const ev = await eb.buildAndSign(this.#config.secret);
        cb(ev);
      });
      this.#conn.on("event", (s, e) => {
        this.#onReply(s, e);
      });
      this.#conn.Connect();
    });
    await this.getInfo();
    this.changed();
    return true;
  }

  async close() {
    this.#conn?.Close();
    return true;
  }

  async getBalance() {
    await this.login();
    const rsp = await this.#rpc<WalletConnectResponse<{ balance: number }>>("get_balance", {});
    if (!rsp.error) {
      return (rsp.result?.balance ?? 0) / 1000;
    } else {
      throw new WalletError(WalletErrorCode.GeneralError, rsp.error.message);
    }
  }

  async createInvoice(req: InvoiceRequest) {
    await this.login();
    const rsp = await this.#rpc<WalletConnectResponse<MakeInvoiceResponse>>("make_invoice", {
      amount: req.amount * 1000,
      description: req.memo,
      expiry: req.expiry,
    });
    if (!rsp.error) {
      return {
        pr: rsp.result?.invoice,
        paymentHash: rsp.result?.payment_hash,
        memo: req.memo,
        amount: req.amount * 1000,
        state: WalletInvoiceState.Pending,
      } as WalletInvoice;
    } else {
      throw new WalletError(WalletErrorCode.GeneralError, rsp.error.message);
    }
  }

  async payInvoice(pr: string) {
    await this.login();
    const rsp = await this.#rpc<WalletConnectResponse<WalletInvoice>>("pay_invoice", {
      invoice: pr,
    });
    if (!rsp.error) {
      return {
        ...rsp.result,
        pr,
        state: WalletInvoiceState.Paid,
      } as WalletInvoice;
    } else {
      throw new WalletError(WalletErrorCode.GeneralError, rsp.error.message);
    }
  }

  async getInvoices() {
    await this.login();
    const rsp = await this.#rpc<WalletConnectResponse<ListTransactionsResponse>>("list_transactions", {
      limit: 50,
    });
    if (!rsp.error) {
      return (
        rsp.result?.transactions.map(
          a =>
            ({
              pr: a.invoice,
              paymentHash: a.payment_hash,
              memo: a.description,
              amount: a.amount,
              fees: a.feed_paid,
              timestamp: typeof a.created_at === "string" ? new Date(a.created_at).getTime() / 1000 : a.created_at,
              preimage: a.preimage,
              state: WalletInvoiceState.Paid,
              direction: a.type === "incoming" ? "in" : "out",
            }) as WalletInvoice,
        ) ?? []
      );
    } else {
      throw new WalletError(WalletErrorCode.GeneralError, rsp.error.message);
    }
  }

  async #onReply(sub: string, e: NostrEvent) {
    if (sub === "info") {
      const pending = this.#commandQueue.get("info");
      if (!pending) {
        throw new WalletError(WalletErrorCode.GeneralError, "No pending info command found");
      }
      pending.resolve(e.content);
      this.#commandQueue.delete("info");
      return;
    }

    if (e.kind !== 23195) {
      throw new WalletError(WalletErrorCode.GeneralError, "Unknown event kind");
    }

    const replyTo = e.tags.find(a => a[0] === "e");
    if (!replyTo) {
      throw new WalletError(WalletErrorCode.GeneralError, "Missing e-tag in command response");
    }

    const pending = this.#commandQueue.get(replyTo[1]);
    if (!pending) {
      throw new WalletError(WalletErrorCode.GeneralError, "No pending command found");
    }

    pending.resolve(e.content);
    this.#commandQueue.delete(replyTo[1]);
    this.#conn?.CloseReq(sub);
  }

  async #rpc<T>(method: string, params: Record<string, string | number | undefined>) {
    if (!this.#conn) throw new WalletError(WalletErrorCode.GeneralError, "Not implemented");
    this.#log("> %o", { method, params });
    if (!this.#supported_methods.includes(method)) {
      const ret = {
        error: {
          code: "NOT_IMPLEMENTED",
          message: `get_info claims the method "${method}" is not supported`,
        },
      } as T;
      this.#log("< %o", ret);
      return ret;
    }

    const payload = JSON.stringify({
      method,
      params,
    });
    const signer = new PrivateKeySigner(this.#config.secret);
    const eb = new EventBuilder();
    eb.kind(23194 as EventKind)
      .content(await signer.nip4Encrypt(payload, this.#config.walletPubkey))
      .tag(["p", this.#config.walletPubkey]);

    const evCommand = await eb.buildAndSign(this.#config.secret);
    this.#conn.QueueReq(
      [
        "REQ",
        evCommand.id.slice(0, 12),
        {
          kinds: [23195 as EventKind],
          authors: [this.#config.walletPubkey],
          ["#e"]: [evCommand.id],
        },
      ],
      () => {
        // ignored
      },
    );
    await this.#conn.SendAsync(evCommand);
    return await new Promise<T>((resolve, reject) => {
      this.#commandQueue.set(evCommand.id, {
        resolve: async (o: string) => {
          const reply = JSON.parse(await signer.nip4Decrypt(o, this.#config.walletPubkey));
          this.#log("< %o", reply);
          resolve(reply);
        },
        reject,
      });
    });
  }
}
