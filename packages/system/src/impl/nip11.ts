import { LRUCache } from "typescript-lru-cache";

export interface RelayInfoDocument {
  name?: string;
  description?: string;
  pubkey?: string;
  contact?: string;
  supported_nips?: number[];
  software?: string;
  version?: string;
  limitation?: {
    payment_required?: boolean;
    max_subscriptions?: number;
    max_filters?: number;
    max_event_tags?: number;
    auth_required?: boolean;
    write_restricted?: boolean;
  };
  relay_countries?: Array<string>;
  language_tags?: Array<string>;
  tags?: Array<string>;
  posting_policy?: string;
  negentropy?: number;
}

/**
 * Internal cache of relay info documents
 */
const RelayInfoCache = new LRUCache<string, RelayInfoDocument>({ maxSize: 100 });

export class Nip11 {
  static async loadRelayDocument(url: string) {
    // Check cache first
    const cached = RelayInfoCache.get(url);
    if (cached) {
      return cached;
    }

    const u = new URL(url);
    const rsp = await fetch(`${u.protocol === "wss:" ? "https:" : "http:"}//${u.host}`, {
      headers: {
        accept: "application/nostr+json",
      },
    });
    if (rsp.ok) {
      const data = await rsp.json();
      for (const [k, v] of Object.entries(data)) {
        if (v === "unset" || v === "" || v === "~") {
          data[k] = undefined;
        }
      }
      const doc = data as RelayInfoDocument;
      // Store in cache
      RelayInfoCache.set(url, doc);
      return doc;
    }
  }
}
