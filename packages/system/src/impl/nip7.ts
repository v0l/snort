import { WorkQueueItem, processWorkQueue, barrierQueue, unwrap } from "@snort/shared";
import { EventSigner, HexKey, NostrEvent } from "..";

const Nip7Queue: Array<WorkQueueItem> = [];
processWorkQueue(Nip7Queue);

export class Nip7Signer implements EventSigner {
  get supports(): string[] {
    return ["nip04"];
  }

  init(): Promise<void> {
    return Promise.resolve();
  }

  async getPubKey(): Promise<string> {
    if (!window.nostr) {
      throw new Error("Cannot use NIP-07 signer, not found!");
    }
    return await barrierQueue(Nip7Queue, () => unwrap(window.nostr).getPublicKey());
  }

  async nip4Encrypt(content: string, key: string): Promise<string> {
    if (!window.nostr) {
      throw new Error("Cannot use NIP-07 signer, not found!");
    }
    return await barrierQueue(Nip7Queue, () =>
      unwrap(window.nostr?.nip04?.encrypt).call(window.nostr?.nip04, key, content),
    );
  }

  async nip4Decrypt(content: string, otherKey: string): Promise<string> {
    if (!window.nostr) {
      throw new Error("Cannot use NIP-07 signer, not found!");
    }
    return await barrierQueue(Nip7Queue, () =>
      unwrap(window.nostr?.nip04?.decrypt).call(window.nostr?.nip04, otherKey, content),
    );
  }

  async nip44Encrypt(content: string, key: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

  async nip44Decrypt(content: string, otherKey: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

  async sign(ev: NostrEvent): Promise<NostrEvent> {
    if (!window.nostr) {
      throw new Error("Cannot use NIP-07 signer, not found!");
    }
    return await barrierQueue(Nip7Queue, async () => {
      const signed = await unwrap(window.nostr).signEvent(ev);
      return {
        ...ev,
        sig: signed.sig,
      };
    });
  }
}
