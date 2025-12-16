import { throwIfOffline, unwrap } from "@snort/shared";
import { EventBuilder, EventKind, type EventSigner } from "@snort/system";

export abstract class JsonApi {
  abstract url: string;
  protected async getJsonAuthd<T>(
    path: string,
    signer: EventSigner,
    method?: "GET" | string,
    body?: object,
    headers?: { [key: string]: string },
  ): Promise<T> {
    const auth = await new EventBuilder()
      .kind(EventKind.HttpAuthentication)
      .tag(["url", `${this.url}${path}`])
      .tag(["method", method ?? "GET"])
      .buildAndSign(signer);

    return this.getJson<T>(path, method, body, {
      ...headers,
      authorization: `Nostr ${window.btoa(JSON.stringify(auth))}`,
    });
  }

  protected async getJson<T>(
    path: string,
    method?: "GET" | string,
    body?: object,
    headers?: { [key: string]: string },
  ): Promise<T> {
    throwIfOffline();
    const rsp = await fetch(`${this.url}${path}`, {
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
          throw new Error(obj.error, obj.code);
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
