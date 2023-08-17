import { AuthHandler, RelaySettings, ConnectionStateSnapshot } from "./connection";
import { RequestBuilder } from "./request-builder";
import { NoteStore } from "./note-collection";
import { Query } from "./query";
import { NostrEvent, ReqFilter } from "./nostr";

export * from "./nostr-system";
export { default as EventKind } from "./event-kind";
export * from "./nostr";
export * from "./links";
export * from "./nips";
export * from "./relay-info";
export * from "./event-ext";
export * from "./connection";
export * from "./note-collection";
export * from "./request-builder";
export * from "./event-publisher";
export * from "./event-builder";
export * from "./nostr-link";
export * from "./profile-cache";
export * from "./zaps";
export * from "./signer";

export * from "./impl/nip4";
export * from "./impl/nip44";
export * from "./impl/nip7";
export * from "./impl/nip46";

export * from "./cache/index";
export * from "./cache/user-relays";
export * from "./cache/user-metadata";
export * from "./cache/relay-metric";

export interface SystemInterface {
  /**
   * Handler function for NIP-42
   */
  HandleAuth?: AuthHandler;
  get Sockets(): Array<ConnectionStateSnapshot>;
  GetQuery(id: string): Query | undefined;
  Query<T extends NoteStore>(type: { new (): T }, req: RequestBuilder | null): Query;
  ConnectToRelay(address: string, options: RelaySettings): Promise<void>;
  DisconnectRelay(address: string): void;
  BroadcastEvent(ev: NostrEvent): void;
  WriteOnceToRelay(relay: string, ev: NostrEvent): Promise<void>;
}

export interface SystemSnapshot {
  queries: Array<{
    id: string;
    filters: Array<ReqFilter>;
    subFilters: Array<ReqFilter>;
  }>;
}

export const enum MessageEncryptorVersion {
  Nip4 = 0,
  XChaCha20 = 1,
}

export interface MessageEncryptorPayload {
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  v: MessageEncryptorVersion
}

export interface MessageEncryptor {
  getSharedSecret(privateKey: string, publicKey: string): Promise<Uint8Array> | Uint8Array;
  encryptData(plaintext: string, sharedSecet: Uint8Array): Promise<MessageEncryptorPayload> | MessageEncryptorPayload;
  decryptData(payload: MessageEncryptorPayload, sharedSecet: Uint8Array): Promise<string> | string;
}
