import { EventKind } from "@snort/nostr";
import { ApiHost } from "Const";
import { SubscriptionType } from "Subscription";
import { EventPublisher } from "System/EventPublisher";

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

  renewSubscription(id: string) {
    return this.#getJsonAuthd<InvoiceResponse>(`api/v1/subscription/${id}/renew`, "GET");
  }

  listSubscriptions() {
    return this.#getJsonAuthd<Array<Subscription>>("api/v1/subscription");
  }

  async #getJsonAuthd<T>(
    path: string,
    method?: "GET" | string,
    body?: { [key: string]: string },
    headers?: { [key: string]: string }
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
    body?: { [key: string]: string },
    headers?: { [key: string]: string }
  ): Promise<T> {
    const rsp = await fetch(`${this.#url}${path}`, {
      method: method,
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        accept: "application/json",
        ...(body ? { "content-type": "application/json" } : {}),
        ...headers,
      },
    });

    const obj = await rsp.json();
    if ("error" in obj) {
      throw new SubscriptionError(obj.error, obj.code);
    }
    return obj as T;
  }
}
