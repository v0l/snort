import { throwIfOffline } from "@snort/shared";
import { EventKind, EventPublisher } from "@snort/system";
import { ApiHost } from "@/Const";
import { unwrap } from "@/SnortUtils";
import { SubscriptionType } from "@/Subscription";

export interface RevenueToday {
  donations: number;
  nip5: number;
}

export interface RevenueSplit {
  pubKey: string;
  split: number;
}

export interface InvoiceResponse {
  pr: string;
}

export interface Subscription {
  id: string;
  type: SubscriptionType;
  created: number;
  expires: number;
  state: "new" | "expired" | "paid";
  handle?: string;
}

export enum SubscriptionErrorCode {
  InternalError = 1,
  SubscriptionActive = 2,
  Duplicate = 3,
}

export class SubscriptionError extends Error {
  code: SubscriptionErrorCode;

  constructor(msg: string, code: SubscriptionErrorCode) {
    super(msg);
    this.code = code;
  }
}

export interface LinkPreviewData {
  title?: string;
  description?: string;
  image?: string;
  og_tags?: Array<[name: string, value: string]>;
}

export interface PushNotifications {
  endpoint: string;
  p256dh: string;
  auth: string;
  scope: string;
}

export interface TranslationRequest {
  text: Array<string>;
  target_lang: string;
}

export interface TranslationResponse {
  translations: Array<{
    detected_source_language: string;
    text: string;
  }>;
}

export interface RelayDistance {
  url: string;
  distance: number;
  users: number;
  country?: string;
  city?: string;
  is_paid?: boolean;
  description?: string;
}

export default class SnortApi {
  #url: string;
  #publisher?: EventPublisher;

  constructor(url?: string, publisher?: EventPublisher) {
    this.#url = new URL(url ?? ApiHost).toString();
    this.#publisher = publisher;
  }

  revenueSplits() {
    return this.#getJson<Array<RevenueSplit>>("api/v1/revenue/splits");
  }

  revenueToday() {
    return this.#getJson<RevenueToday>("api/v1/revenue/today");
  }

  twitterImport(username: string) {
    return this.#getJson<Array<string>>(`api/v1/twitter/follows-for-nostr?username=${encodeURIComponent(username)}`);
  }

  createSubscription(type: number) {
    return this.#getJsonAuthd<InvoiceResponse>(`api/v1/subscription?type=${type}`, "PUT");
  }

  renewSubscription(id: string, months = 1) {
    return this.#getJsonAuthd<InvoiceResponse>(`api/v1/subscription/${id}/renew?months=${months}`, "GET");
  }

  listSubscriptions() {
    return this.#getJsonAuthd<Array<Subscription>>("api/v1/subscription");
  }

  linkPreview(url: string) {
    return this.#getJson<LinkPreviewData>(`api/v1/preview?url=${encodeURIComponent(url)}`);
  }

  onChainDonation() {
    return this.#getJson<{ address: string }>("p/on-chain");
  }

  getPushNotificationInfo() {
    return this.#getJson<{ publicKey: string }>("api/v1/notifications/info");
  }

  registerPushNotifications(sub: PushNotifications) {
    return this.#getJsonAuthd<void>("api/v1/notifications/register", "POST", sub);
  }

  translate(tx: TranslationRequest) {
    return this.#getJson<TranslationResponse | object>("api/v1/translate", "POST", tx);
  }

  closeRelays(lat: number, lon: number, count = 5) {
    return this.#getJson<Array<RelayDistance>>(`api/v1/relays?count=${count}`, "POST", { lat, lon });
  }

  async #getJsonAuthd<T>(
    path: string,
    method?: "GET" | string,
    body?: object,
    headers?: { [key: string]: string },
  ): Promise<T> {
    if (!this.#publisher) {
      throw new Error("Publisher not set");
    }
    const auth = await this.#publisher.generic(eb => {
      return eb
        .kind(EventKind.HttpAuthentication)
        .tag(["url", `${this.#url}${path}`])
        .tag(["method", method ?? "GET"]);
    });

    return this.#getJson<T>(path, method, body, {
      ...headers,
      authorization: `Nostr ${window.btoa(JSON.stringify(auth))}`,
    });
  }

  async #getJson<T>(
    path: string,
    method?: "GET" | string,
    body?: object,
    headers?: { [key: string]: string },
  ): Promise<T> {
    throwIfOffline();
    const rsp = await fetch(`${this.#url}${path}`, {
      method: method,
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        accept: "application/json",
        ...(body ? { "content-type": "application/json" } : {}),
        ...headers,
      },
    });

    if (rsp.ok) {
      const text = (await rsp.text()) as string | null;
      if ((text?.length ?? 0) > 0) {
        const obj = JSON.parse(unwrap(text));
        if ("error" in obj) {
          throw new SubscriptionError(obj.error, obj.code);
        }
        return obj as T;
      } else {
        return {} as T;
      }
    } else {
      throw new Error("Invalid response");
    }
  }
}
