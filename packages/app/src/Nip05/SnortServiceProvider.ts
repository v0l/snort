import { EventKind } from "@snort/nostr";
import { EventPublisher } from "Feed/EventPublisher";
import { ServiceError, ServiceProvider } from "./ServiceProvider";

export interface ManageHandle {
  id: string;
  handle: string;
  domain: string;
  pubkey: string;
  created: Date;
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
    return this.getJsonAuthd<object>(`/${id}?to=${to}`, "PATCH");
  }

  async getJsonAuthd<T>(
    path: string,
    method?: "GET" | string,
    body?: { [key: string]: string },
    headers?: { [key: string]: string }
  ): Promise<T | ServiceError> {
    const auth = await this.#publisher.generic("", EventKind.HttpAuthentication, [
      ["url", `${this.url}${path}`],
      ["method", method ?? "GET"],
    ]);
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
