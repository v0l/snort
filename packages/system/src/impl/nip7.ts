import { WorkQueueItem, processWorkQueue, barrierQueue, unwrap } from "@snort/shared";
import { EventSigner, NostrEvent } from "..";

const Nip7Queue: Array<WorkQueueItem> = [];
processWorkQueue(Nip7Queue);

declare global {
  interface NostrEncryptor {
    encrypt(recipientHexPubKey: string, value: string): Promise<string>;
    decrypt(senderHexPubKey: string, value: string): Promise<string>;
  }
  interface Window {
    nostr?: {
      getPublicKey: () => Promise<string>;
      signEvent: (ev: NostrEvent) => Promise<NostrEvent>;
      nip04?: NostrEncryptor;
      nip44?: NostrEncryptor;
    };
  }
}

export class Nip7Signer implements EventSigner {
  get supports(): string[] {
    const supports = ["nip04"];
    if (window.nostr && "nip44" in window.nostr) {
      supports.push("nip44");
    }
    return supports;
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
    if (!window.nostr) {
      throw new Error("Cannot use NIP-07 signer, not found!");
    }
    return await barrierQueue(Nip7Queue, async () => {
      const window = globalThis.window;
      return await window.nostr!.nip44!.encrypt(key, content);
    });
  }

  async nip44Decrypt(content: string, otherKey: string): Promise<string> {
    if (!window.nostr) {
      throw new Error("Cannot use NIP-07 signer, not found!");
    }
    return await barrierQueue(Nip7Queue, async () => {
      const window = globalThis.window;
      return await window.nostr!.nip44!.decrypt(otherKey, content);
    });
  }

  async sign(ev: NostrEvent): Promise<NostrEvent> {
    if (!window.nostr) {
      throw new Error("Cannot use NIP-07 signer, not found!");
    }
    return await barrierQueue(Nip7Queue, async () => {
      const signed = await unwrap(window.nostr).signEvent(ev);
      if (signed.id !== ev.id) {
        throw new Error(
          "Signer returned different event id! Please check your event format or contact the signer developer!",
        );
      }
      return {
        ...ev,
        sig: signed.sig,
      };
    });
  }
}
