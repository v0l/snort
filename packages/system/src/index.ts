import { AuthHandler, RelaySettings, ConnectionStateSnapshot } from "./Connection";
import { RequestBuilder } from "./RequestBuilder";
import { NoteStore } from "./NoteCollection";
import { Query } from "./Query";
import { NostrEvent, ReqFilter } from "./Nostr";

export * from "./NostrSystem";
export { default as EventKind } from "./EventKind";
export * from "./Nostr";
export * from "./Links";
export * from "./Nips";
export * from "./RelayInfo";
export * from "./EventExt";
export * from "./Connection";
export * from "./NoteCollection";
export * from "./RequestBuilder";
export * from "./EventPublisher";
export * from "./EventBuilder";
export * from "./NostrLink";
export * from "./ProfileCache";

export * from "./impl/nip4";
export * from "./impl/nip44";

export * from "./cache";
export * from "./cache/UserRelayCache";
export * from "./cache/UserCache";
export * from "./cache/RelayMetricCache";

export interface SystemInterface {
  /**
   * Handler function for NIP-42
   */
  HandleAuth?: AuthHandler;
  get Sockets(): Array<ConnectionStateSnapshot>;
  GetQuery(id: string): Query | undefined;
  Query<T extends NoteStore>(type: { new(): T }, req: RequestBuilder | null): Query;
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

export interface MessageEncryptor {
  getSharedSecret(privateKey: string, publicKey: string): Promise<Uint8Array> | Uint8Array
  encryptData(plaintext: string, sharedSecet: Uint8Array): Promise<string> | string
  decryptData(cyphertext: string, sharedSecet: Uint8Array): Promise<string> | string
}