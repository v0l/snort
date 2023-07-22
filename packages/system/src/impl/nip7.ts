import { WorkQueueItem, processWorkQueue, barrierQueue, unwrap } from "@snort/shared";
import { EventSigner } from "../event-publisher";
import { HexKey, NostrEvent } from "../nostr";

const Nip7Queue: Array<WorkQueueItem> = [];
processWorkQueue(Nip7Queue);

declare global {
  interface Window {
    nostr?: {
      getPublicKey: () => Promise<HexKey>;
      signEvent: <T extends NostrEvent>(event: T) => Promise<T>;

      getRelays?: () => Promise<Record<string, { read: boolean; write: boolean }>>;

      nip04?: {
        encrypt?: (pubkey: HexKey, plaintext: string) => Promise<string>;
        decrypt?: (pubkey: HexKey, ciphertext: string) => Promise<string>;
      };
    };
  }
}

export class Nip7Signer implements EventSigner {
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
      unwrap(window.nostr?.nip04?.encrypt).call(window.nostr?.nip04, key, content)
    );
  }

  async nip4Decrypt(content: string, otherKey: string): Promise<string> {
    if (!window.nostr) {
      throw new Error("Cannot use NIP-07 signer, not found!");
    }
    return await barrierQueue(Nip7Queue, () =>
      unwrap(window.nostr?.nip04?.decrypt).call(window.nostr?.nip04, otherKey, content)
    );
  }

  async sign(ev: NostrEvent): Promise<NostrEvent> {
    if (!window.nostr) {
      throw new Error("Cannot use NIP-07 signer, not found!");
    }
    return await barrierQueue(Nip7Queue, () => unwrap(window.nostr).signEvent(ev));
  }
}
