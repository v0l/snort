import { EventKind } from "@snort/nostr";
import { EventPublisher } from "System/EventPublisher";
import { ServiceError, ServiceProvider } from "./ServiceProvider";

export interface ManageHandle {
  id: string;
  handle: string;
  domain: string;
  pubkey: string;
  created: Date;
  lnAddress?: string;
}

export enum ForwardType {
  Redirect = 0,
  ProxyDirect = 1,
  ProxyTrusted = 2,
}

export interface PatchHandle {
  lnAddress?: string;
  forwardType?: ForwardType;
}

export default class SnortServiceProvider extends ServiceProvider {
  readonly #publisher: EventPublisher;

  constructor(publisher: EventPublisher, url: string | URL) {
    super(url);
    this.#publisher = publisher;
  }

  async list() {
    return this.getJsonAuthd<Array<ManageHandle>>("/list", "GET");
  }

  async transfer(id: string, to: string) {
    return this.getJsonAuthd<object>(`/${id}/transfer?to=${to}`, "PATCH");
  }

  async patch(id: string, obj: PatchHandle) {
    return this.getJsonAuthd<object>(`/${id}`, "PATCH", obj);
  }

  async registerForSubscription(handle: string, domain: string, id: string) {
    return this.getJsonAuthd<object>(`/registration/register/${id}`, "PUT", {
      name: handle,
      domain,
      pk: "",
      ref: "snort",
    });
  }

  async getJsonAuthd<T>(
    path: string,
    method?: "GET" | string,
    body?: unknown,
    headers?: { [key: string]: string }
  ): Promise<T | ServiceError> {
    const auth = await this.#publisher.generic(eb => {
      eb.kind(EventKind.HttpAuthentication);
      eb.tag(["url", `${this.url}${path}`]);
      eb.tag(["method", method ?? "GET"]);
      return eb;
    });
    if (!auth) {
      return {
        error: "INVALID_TOKEN",
      } as ServiceError;
    }

    return this.getJson<T>(path, method, body, {
      ...headers,
      authorization: `Nostr ${window.btoa(JSON.stringify(auth))}`,
    });
  }
}
