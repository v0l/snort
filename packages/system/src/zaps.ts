import { FeedCache } from "@snort/shared";
import { sha256, decodeInvoice, InvoiceDetails } from "@snort/shared";
import { HexKey, NostrEvent } from "./nostr";
import { findTag } from "./utils";
import { MetadataCache } from "./cache";

function getInvoice(zap: NostrEvent): InvoiceDetails | undefined {
    const bolt11 = findTag(zap, "bolt11");
    if (!bolt11) {
        throw new Error("Invalid zap, missing bolt11 tag");
    }
    return decodeInvoice(bolt11);
}

export function parseZap(zapReceipt: NostrEvent, userCache: FeedCache<MetadataCache>, refNote?: NostrEvent): ParsedZap {
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
            const isForwardedZap = refNote?.tags.some(a => a[0] === "zap") ?? false;
            const anonZap = zapRequest.tags.find(a => a[0] === "anon");
            const metaHash = sha256(innerZapJson);
            const pollOpt = zapRequest.tags.find(a => a[0] === "poll_option")?.[1];
            const ret: ParsedZap = {
                id: zapReceipt.id,
                zapService: zapReceipt.pubkey,
                amount: (invoice?.amount ?? 0) / 1000,
                event: findTag(zapRequest, "e"),
                sender: zapRequest.pubkey,
                receiver: findTag(zapRequest, "p"),
                valid: true,
                anonZap: anonZap !== undefined,
                content: zapRequest.content,
                errors: [],
                pollOption: pollOpt ? Number(pollOpt) : undefined,
            };
            if (invoice?.descriptionHash !== metaHash) {
                ret.valid = false;
                ret.errors.push("description_hash does not match zap request");
            }
            if (findTag(zapRequest, "p") !== findTag(zapReceipt, "p")) {
                ret.valid = false;
                ret.errors.push("p tags dont match");
            }
            if (ret.event && ret.event !== findTag(zapReceipt, "e")) {
                ret.valid = false;
                ret.errors.push("e tags dont match");
            }
            if (findTag(zapRequest, "amount") === invoice?.amount) {
                ret.valid = false;
                ret.errors.push("amount tag does not match invoice amount");
            }
            if (userCache.getFromCache(ret.receiver)?.zapService !== ret.zapService && !isForwardedZap) {
                ret.valid = false;
                ret.errors.push("zap service pubkey doesn't match");
            }
            return ret;
        } catch (e) {
            // ignored: console.debug("Invalid zap", zapReceipt, e);
        }
    }
    return {
        id: zapReceipt.id,
        zapService: zapReceipt.pubkey,
        amount: 0,
        valid: false,
        anonZap: false,
        errors: ["invalid zap, parsing failed"],
    };
}

export interface ParsedZap {
    id: HexKey;
    event?: HexKey;
    receiver?: HexKey;
    amount: number;
    content?: string;
    sender?: HexKey;
    valid: boolean;
    zapService: HexKey;
    anonZap: boolean;
    errors: Array<string>;
    pollOption?: number;
}
