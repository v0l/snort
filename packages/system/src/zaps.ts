import { decodeInvoice, InvoiceDetails } from "@snort/shared";
import { NostrEvent } from "./nostr";
import { findTag } from "./utils";
import { EventExt } from "./event-ext";
import { NostrLink } from "./nostr-link";
import debug from "debug";

const Log = debug("zaps");
const ParsedZapCache = new Map<string, ParsedZap>();

function getInvoice(zap: NostrEvent): InvoiceDetails | undefined {
  const bolt11 = findTag(zap, "bolt11");
  if (!bolt11) {
    throw new Error("Invalid zap, missing bolt11 tag");
  }
  return decodeInvoice(bolt11);
}

export function parseZap(zapReceipt: NostrEvent): ParsedZap {
  const existing = ParsedZapCache.get(zapReceipt.id);
  if (existing) {
    return existing;
  }

  let innerZapJson = findTag(zapReceipt, "description");
  if (innerZapJson) {
    try {
      const invoice = getInvoice(zapReceipt);
      if (innerZapJson.startsWith("%")) {
        innerZapJson = decodeURIComponent(innerZapJson);
      }
      const zapRequest: NostrEvent = JSON.parse(innerZapJson);
      if (Array.isArray(zapRequest)) {
        // old format, ignored
        throw new Error("deprecated zap format");
      }
      const zapRequestThread = EventExt.extractThread(zapRequest);
      const requestContext = zapRequestThread?.root;

      const anonZap = zapRequest.tags.find(a => a[0] === "anon");
      const pollOpt = zapRequest.tags.find(a => a[0] === "poll_option")?.[1];
      const ret: ParsedZap = {
        id: zapReceipt.id,
        zapService: zapReceipt.pubkey,
        amount: (invoice?.amount ?? 0) / 1000,
        event: requestContext ? NostrLink.fromThreadTag(requestContext) : undefined,
        sender: zapRequest.pubkey,
        receiver: findTag(zapRequest, "p"),
        valid: true,
        anonZap: anonZap !== undefined,
        content: zapRequest.content,
        errors: [],
        pollOption: pollOpt ? Number(pollOpt) : undefined,
      };
      if (findTag(zapRequest, "p") !== findTag(zapReceipt, "p")) {
        ret.valid = false;
        ret.errors.push("p tags dont match");
      }
      if (findTag(zapRequest, "amount") === invoice?.amount) {
        ret.valid = false;
        ret.errors.push("amount tag does not match invoice amount");
      }
      if (!ret.valid) {
        Log("Invalid zap %O", ret);
      }
      return ret;
    } catch {
      // ignored
    }
  }
  const ret = {
    id: zapReceipt.id,
    zapService: zapReceipt.pubkey,
    amount: 0,
    valid: false,
    anonZap: false,
    errors: ["invalid zap, parsing failed"],
  };
  if (!ret.valid) {
    Log("Invalid zap %O", ret);
  }
  ParsedZapCache.set(ret.id, ret);
  return ret;
}

export interface ParsedZap {
  id: string;
  amount: number;
  zapService: string;
  valid: boolean;
  errors: Array<string>;

  anonZap: boolean;
  event?: NostrLink;
  receiver?: string;
  content?: string;
  sender?: string;
  pollOption?: number;
}
