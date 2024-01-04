/* eslint-disable @typescript-eslint/no-unused-vars */
import { EventSigner, NostrEvent } from "@snort/system";

import { Nip7os } from "@/Utils/Login/index";

export class Nip7OsSigner implements EventSigner {
  #interface: Nip7os;

  constructor() {
    if ("nostr_os" in window && window.nostr_os) {
      this.#interface = window.nostr_os;
    } else {
      throw new Error("Nost OS extension not available");
    }
  }

  get supports(): string[] {
    return ["nip04"];
  }

  init(): Promise<void> {
    return Promise.resolve();
  }

  getPubKey(): string | Promise<string> {
    return this.#interface.getPublicKey();
  }

  nip4Encrypt(content: string, key: string): Promise<string> {
    return Promise.resolve(this.#interface.nip04_encrypt(content, key));
  }

  nip4Decrypt(content: string, otherKey: string): Promise<string> {
    return Promise.resolve(this.#interface.nip04_decrypt(content, otherKey));
  }

  nip44Encrypt(content: string, key: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

  nip44Decrypt(content: string, otherKey: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

  sign(ev: NostrEvent): Promise<NostrEvent> {
    const ret = this.#interface.signEvent(JSON.stringify(ev));
    return Promise.resolve(JSON.parse(ret) as NostrEvent);
  }
}
