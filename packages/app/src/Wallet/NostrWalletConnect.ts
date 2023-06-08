import { Connection, EventKind, NostrEvent, EventBuilder, EventExt } from "@snort/system";
import { LNWallet, WalletError, WalletErrorCode, WalletInfo, WalletInvoice, WalletInvoiceState } from "Wallet";
import debug from "debug";

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

export class NostrConnectWallet implements LNWallet {
  #config: WalletConnectConfig;
  #conn?: Connection;
  #commandQueue: Map<string, QueueObj>;

  constructor(cfg: string) {
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

  async getInfo() {
    await this.login();
    return await new Promise<WalletInfo>((resolve, reject) => {
      this.#commandQueue.set("info", {
        resolve: (o: string) => {
          resolve({
            alias: "NWC",
            chains: o.split(" "),
          } as WalletInfo);
        },
        reject,
      });
      this.#conn?.QueueReq(["REQ", "info", { kinds: [13194], limit: 1 }], () => {
        // ignored
      });
    });
  }

  async login() {
    if (this.#conn) return true;

    return await new Promise<boolean>(resolve => {
      this.#conn = new Connection(this.#config.relayUrl, { read: true, write: true });
      this.#conn.OnConnected = () => resolve(true);
      this.#conn.OnEvent = (s, e) => {
        this.#onReply(s, e);
      };
      this.#conn.Connect();
    });
  }

  async close() {
    this.#conn?.Close();
    return true;
  }

  async getBalance() {
    return 0;
  }

  createInvoice() {
    return Promise.reject(new WalletError(WalletErrorCode.GeneralError, "Not implemented"));
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

  getInvoices() {
    return Promise.resolve([]);
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

  async #rpc<T>(method: string, params: Record<string, string>) {
    if (!this.#conn) throw new WalletError(WalletErrorCode.GeneralError, "Not implemented");

    const payload = JSON.stringify({
      method,
      params,
    });
    const eb = new EventBuilder();
    eb.kind(23194 as EventKind)
      .content(await EventExt.encryptData(payload, this.#config.walletPubkey, this.#config.secret))
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
      }
    );
    await this.#conn.SendAsync(evCommand);
    return await new Promise<T>((resolve, reject) => {
      this.#commandQueue.set(evCommand.id, {
        resolve: async (o: string) => {
          const reply = JSON.parse(await EventExt.decryptData(o, this.#config.secret, this.#config.walletPubkey));
          debug("NWC")("%o", reply);
          resolve(reply);
        },
        reject,
      });
    });
  }
}
