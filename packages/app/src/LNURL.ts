import { Event, HexKey } from "@snort/nostr";
import { EmailRegex } from "Const";
import { bech32ToText, unwrap } from "Util";

const PayServiceTag = "payRequest";

export class LNURL {
  #url: URL;
  #service?: LNURLService;

  constructor(lnurl: string) {
    lnurl = lnurl.toLowerCase().trim();
    if (lnurl.startsWith("lnurl")) {
      const decoded = bech32ToText(lnurl);
      if (!decoded.startsWith("http")) {
        throw new Error("Invalid LNURL: not a url");
      }
      this.#url = new URL(decoded);
    } else if (lnurl.match(EmailRegex)) {
      const [handle, domain] = lnurl.split("@");
      this.#url = new URL(`https://${domain}/.well-known/lnurlp/${handle}`);
    } else if (lnurl.startsWith("http")) {
      this.#url = new URL(lnurl);
    } else {
      throw new Error("Invalid LNURL: could not determine service url");
    }
  }

  async load() {
    const rsp = await fetch(this.#url);
    if (rsp.ok) {
      this.#service = await rsp.json();
      this.#validateService();
    }
  }

  /**
   * Fetch an invoice from the LNURL service
   * @param amount Amount in sats
   * @param comment
   * @param zap
   * @returns
   */
  async getInvoice(amount: number, comment?: string, zap?: Event) {
    const callback = new URL(unwrap(this.#service?.callback));
    const query = new Map<string, string>();

    if (callback.search.length > 0) {
      callback.search
        .slice(1)
        .split("&")
        .forEach(a => {
          const pSplit = a.split("=");
          query.set(pSplit[0], pSplit[1]);
        });
    }
    query.set("amount", Math.floor(amount * 1000).toString());
    if (comment && this.#service?.commentAllowed) {
      query.set("comment", comment);
    }
    if (this.#service?.nostrPubkey && zap) {
      query.set("nostr", JSON.stringify(zap.ToObject()));
    }

    const baseUrl = `${callback.protocol}//${callback.host}${callback.pathname}`;
    const queryJoined = [...query.entries()].map(v => `${v[0]}=${encodeURIComponent(v[1])}`).join("&");
    try {
      const rsp = await fetch(`${baseUrl}?${queryJoined}`);
      if (rsp.ok) {
        const data: LNURLInvoice = await rsp.json();
        console.debug("[LNURL]: ", data);
        if (data.status === "ERROR") {
          throw new Error(data.reason);
        } else {
          return data;
        }
      } else {
        throw new Error(`Failed to fetch invoice (${rsp.statusText})`);
      }
    } catch (e) {
      throw new Error("Failed to load callback");
    }
  }

  /**
   * Are zaps (NIP-57) supported
   */
  get canZap() {
    return this.#service?.nostrPubkey ? true : false;
  }

  /**
   * Get the max allowed comment length
   */
  get maxCommentLength() {
    return this.#service?.commentAllowed ?? 0;
  }

  /**
   * Min sendable in milli-sats
   */
  get min() {
    return this.#service?.minSendable ?? 1_000; // 1 sat
  }

  /**
   * Max sendable in milli-sats
   */
  get max() {
    return this.#service?.maxSendable ?? 100e9; // 1 BTC in milli-sats
  }

  #validateService() {
    if (this.#service?.tag !== PayServiceTag) {
      throw new Error("Invalid service: only lnurlp is supported");
    }
    if (!this.#service?.callback) {
      throw new Error("Invalid service: no callback url");
    }
  }
}

export interface LNURLService {
  tag: string;
  nostrPubkey?: HexKey;
  minSendable?: number;
  maxSendable?: number;
  metadata: string;
  callback: string;
  commentAllowed?: number;
}

export interface LNURLStatus {
  status: "SUCCESS" | "ERROR";
  reason?: string;
}

export interface LNURLInvoice extends LNURLStatus {
  pr?: string;
  successAction?: LNURLSuccessAction;
}

export interface LNURLSuccessAction {
  description?: string;
  url?: string;
}
