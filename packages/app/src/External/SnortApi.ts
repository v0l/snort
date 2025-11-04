import { EventPublisher, EventSigner } from "@snort/system";

import { ApiHost } from "@/Utils/Const";
import { SubscriptionType } from "@/Utils/Subscription";
import { JsonApi } from "./base";

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

export interface RefCodeResponse {
  code: string;
  pubkey: string;
  revShare?: number;
  leaderState?: "pending" | "approved";
}

/**
 * API client wrapper for https://api.snort.social/swagger
 */
export default class SnortApi extends JsonApi {
  readonly url: string;
  readonly signer?: EventSigner;

  constructor(url?: string, signer?: EventSigner | EventPublisher) {
    super();
    this.url = new URL(url ?? ApiHost).toString();
    this.signer = signer instanceof EventPublisher ? signer.signer : signer;
  }

  revenueSplits() {
    return this.getJson<Array<RevenueSplit>>("api/v1/revenue/splits");
  }

  revenueToday() {
    return this.getJson<RevenueToday>("api/v1/revenue/today");
  }

  createSubscription(type: number, refCode?: string) {
    if (!this.signer) {
      throw new Error("No signer set");
    }
    return this.getJsonAuthd<InvoiceResponse>(
      `api/v1/subscription?type=${type}&refCode=${refCode}`,
      this.signer,
      "PUT",
    );
  }

  renewSubscription(id: string, months = 1) {
    if (!this.signer) {
      throw new Error("No signer set");
    }
    return this.getJsonAuthd<InvoiceResponse>(`api/v1/subscription/${id}/renew?months=${months}`, this.signer, "GET");
  }

  listSubscriptions() {
    if (!this.signer) {
      throw new Error("No signer set");
    }
    return this.getJsonAuthd<Array<Subscription>>("api/v1/subscription", this.signer);
  }

  onChainDonation() {
    return this.getJson<{ address: string }>("p/on-chain");
  }

  getPushNotificationInfo() {
    return this.getJson<{ publicKey: string }>("api/v1/notifications/info");
  }

  registerPushNotifications(sub: PushNotifications) {
    if (!this.signer) {
      throw new Error("No signer set");
    }
    return this.getJsonAuthd<void>("api/v1/notifications/register", this.signer, "POST", sub);
  }

  translate(tx: TranslationRequest) {
    return this.getJson<TranslationResponse | object>("api/v1/translate", "POST", tx);
  }

  closeRelays(lat: number, lon: number, count = 5) {
    return this.getJson<Array<RelayDistance>>(`api/v1/relays?count=${count}`, "POST", { lat, lon });
  }

  getRefCode() {
    if (!this.signer) {
      throw new Error("No signer set");
    }
    return this.getJsonAuthd<RefCodeResponse>("api/v1/referral", this.signer, "GET");
  }

  getRefCodeInfo(code: string) {
    return this.getJson<RefCodeResponse>(`api/v1/referral/${code}`, "GET");
  }

  applyForLeader() {
    if (!this.signer) {
      throw new Error("No signer set");
    }
    return this.getJsonAuthd<RefCodeResponse>("api/v1/referral/leader-apply", this.signer, "POST");
  }
}
