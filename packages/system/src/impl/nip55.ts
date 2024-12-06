import debug from "debug";
import { NostrEvent, NotSignedNostrEvent } from "../nostr";
import { EventSigner } from "../signer";
import { v4 as uuid } from "uuid";
import { bech32ToHex } from "@snort/shared";

export class Nip55Signer implements EventSigner {
  #log = debug("NIP-55");
  #queue: Array<{ id: string; resolve: (o: any) => void; reject: () => void }> = [];

  init(): Promise<void> {
    // nothing here
    return Promise.resolve();
  }

  async getPubKey() {
    let pk = await this.#call("get_public_key", "signature");
    if (pk.startsWith("npub")) {
      pk = bech32ToHex(pk);
    }
    return pk;
  }

  async nip4Encrypt(content: string, key: string) {
    return await this.#call("nip04_encrypt", "signature", content, new Map([["pubkey", key]]));
  }

  async nip4Decrypt(content: string, otherKey: string) {
    return await this.#call("nip04_decrypt", "signature", content, new Map([["pubkey", otherKey]]));
  }

  async nip44Encrypt(content: string, key: string) {
    return await this.#call("nip44_encrypt", "signature", content, new Map([["pubkey", key]]));
  }

  async nip44Decrypt(content: string, otherKey: string) {
    return await this.#call("nip44_decrypt", "signature", content, new Map([["pubkey", otherKey]]));
  }

  async sign(ev: NostrEvent | NotSignedNostrEvent) {
    const evRet = await this.#call("sign_event", "event", ev);
    return JSON.parse(evRet);
  }

  get supports(): string[] {
    return ["nip04", "nip44"];
  }

  #call(
    method: string,
    returnType: string,
    obj?: NostrEvent | NotSignedNostrEvent | string,
    otherParams?: Map<string, string>,
  ) {
    const id = uuid();
    const objString = typeof obj === "string" ? obj : obj != undefined ? JSON.stringify(obj) : undefined;

    const params = new URLSearchParams();
    params.append("compressionType", "none");
    params.append("returnType", returnType);
    params.append("type", method);
    if (otherParams) {
      for (const [k, v] of otherParams) {
        params.append(k, v);
      }
    }

    return new Promise<string>((resolve, reject) => {
      const t = setInterval(async () => {
        if (document.hasFocus()) {
          const text = await navigator.clipboard.readText();
          if (text) {
            this.#log("Response: %s", text);
            await navigator.clipboard.writeText("");
            resolve(text);
            clearInterval(t);
          }
        }
      }, 500);

      const dst = `nostrsigner:${objString ?? ""}?${params.toString()}`;
      this.#log("Sending command %s, %s", id, dst);
      globalThis.location.href = dst;
    });
  }
}
