import { HexKey, RawEvent } from "@snort/nostr";
import { EmailRegex } from "Const";
import { bech32ToText, unwrap } from "SnortUtils";

const PayServiceTag = "payRequest";

export enum LNURLErrorCode {
  ServiceUnavailable = 1,
  InvalidLNURL = 2,
}

export class LNURLError extends Error {
  code: LNURLErrorCode;

  constructor(code: LNURLErrorCode, msg: string) {
    super(msg);
    this.code = code;
  }
}

export class LNURL {
  #url: URL;
  #service?: LNURLService;

  /**
   * Setup LNURL service
   * @param lnurl bech32 lnurl / lightning address / https url
   */
  constructor(lnurl: string) {
    lnurl = lnurl.toLowerCase().trim();
    if (lnurl.startsWith("lnurl")) {
      const decoded = bech32ToText(lnurl);
      if (!decoded.startsWith("http")) {
        throw new LNURLError(LNURLErrorCode.InvalidLNURL, "Not a url");
      }
      this.#url = new URL(decoded);
    } else if (lnurl.match(EmailRegex)) {
      const [handle, domain] = lnurl.split("@");
      this.#url = new URL(`https://${domain}/.well-known/lnurlp/${handle}`);
    } else if (lnurl.startsWith("https:")) {
      this.#url = new URL(lnurl);
    } else if (lnurl.startsWith("lnurlp:")) {
      const tmp = new URL(lnurl);
      tmp.protocol = "https:";
      this.#url = tmp;
    } else {
      throw new LNURLError(LNURLErrorCode.InvalidLNURL, "Could not determine service url");
    }
  }

  /**
   * URL of this payService
   */
  get url() {
    return this.#url;
  }

  /**
   * Return the optimal formatted LNURL
   */
  get lnurl() {
    if (this.isLNAddress) {
      return this.getLNAddress();
    }
    return this.#url.toString();
  }

  /**
   * Human readable name for this service
   */
  get name() {
    // LN Address formatted URL
    if (this.isLNAddress) {
      return this.getLNAddress();
    }
    // Generic LUD-06 url
    return this.#url.hostname;
  }

  /**
   * Is this LNURL a LUD-16 Lightning Address
   */
  get isLNAddress() {
    return this.#url.pathname.startsWith("/.well-known/lnurlp/");
  }

  /**
   * Get the LN Address for this LNURL
   */
  getLNAddress() {
    const pathParts = this.#url.pathname.split("/");
    const username = pathParts[pathParts.length - 1];
    return `${username}@${this.#url.hostname}`;
  }

  /**
   * Create a NIP-57 zap tag from this LNURL
   */
  getZapTag() {
    if (this.isLNAddress) {
      return ["zap", this.getLNAddress(), "lud16"];
    } else {
      return ["zap", this.#url.toString(), "lud06"];
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
  async getInvoice(amount: number, comment?: string, zap?: RawEvent) {
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
      query.set("nostr", JSON.stringify(zap));
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
        throw new LNURLError(LNURLErrorCode.ServiceUnavailable, `Failed to fetch invoice (${rsp.statusText})`);
      }
    } catch (e) {
      throw new LNURLError(LNURLErrorCode.ServiceUnavailable, "Failed to load callback");
    }
  }

  /**
   * Are zaps (NIP-57) supported
   */
  get canZap() {
    return this.#service?.nostrPubkey ? true : false;
  }

  /**
   * Return pubkey of zap service
   */
  get zapperPubkey() {
    return this.#service?.nostrPubkey;
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
      throw new LNURLError(LNURLErrorCode.InvalidLNURL, "Only LNURLp is supported");
    }
    if (!this.#service?.callback) {
      throw new LNURLError(LNURLErrorCode.InvalidLNURL, "No callback url");
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
