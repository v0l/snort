import { AuthHandler, RelaySettings, ConnectionStateSnapshot, OkResponse } from "./connection";
import { RequestBuilder } from "./request-builder";
import { NoteStore, NoteStoreSnapshotData } from "./note-collection";
import { Query } from "./query";
import { NostrEvent, ReqFilter, TaggedNostrEvent } from "./nostr";
import { ProfileLoaderService } from "./profile-cache";
import { RelayCache } from "./gossip-model";
import { QueryOptimizer } from "./query-optimizer";
import { base64 } from "@scure/base";

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
export * from "./text";
export * from "./pow";
export * from "./pow-util";
export * from "./query-optimizer";
export * from "./encrypted";

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

  /**
   * Get a snapshot of the relay connections
   */
  get Sockets(): Array<ConnectionStateSnapshot>;

  /**
   * Get an active query by ID
   * @param id Query ID
   */
  GetQuery(id: string): Query | undefined;

  /**
   * Open a new query to relays
   * @param type Store type
   * @param req Request to send to relays
   */
  Query<T extends NoteStore>(type: { new (): T }, req: RequestBuilder): Query;

  /**
   * Fetch data from nostr relays asynchronously
   * @param req Request to send to relays
   * @param cb A callback which will fire every 100ms when new data is received
   */
  Fetch(req: RequestBuilder, cb?: (evs: Array<TaggedNostrEvent>) => void): Promise<NoteStoreSnapshotData>;

  /**
   * Create a new permanent connection to a relay
   * @param address Relay URL
   * @param options Read/Write settings
   */
  ConnectToRelay(address: string, options: RelaySettings): Promise<void>;

  /**
   * Disconnect permanent relay connection
   * @param address Relay URL
   */
  DisconnectRelay(address: string): void;

  /**
   * Send an event to all permanent connections
   * @param ev Event to broadcast
   * @param cb Callback to handle OkResponse as they arrive
   */
  BroadcastEvent(ev: NostrEvent, cb?: (rsp: OkResponse) => void): Promise<Array<OkResponse>>;

  /**
   * Connect to a specific relay and send an event and wait for the response
   * @param relay Relay URL
   * @param ev Event to send
   */
  WriteOnceToRelay(relay: string, ev: NostrEvent): Promise<OkResponse>;

  /**
   * Profile cache/loader
   */
  get ProfileLoader(): ProfileLoaderService;

  /**
   * Relay cache for "Gossip" model
   */
  get RelayCache(): RelayCache;

  /**
   * Query optimizer
   */
  get QueryOptimizer(): QueryOptimizer;
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
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  v: MessageEncryptorVersion;
}

export interface MessageEncryptor {
  getSharedSecret(privateKey: string, publicKey: string): Promise<Uint8Array> | Uint8Array;
  encryptData(plaintext: string, sharedSecet: Uint8Array): Promise<MessageEncryptorPayload> | MessageEncryptorPayload;
  decryptData(payload: MessageEncryptorPayload, sharedSecet: Uint8Array): Promise<string> | string;
}

export function decodeEncryptionPayload(p: string) {
  if (p.startsWith("{") && p.endsWith("}")) {
    const pj = JSON.parse(p) as { v: number; nonce: string; ciphertext: string };
    return {
      v: pj.v,
      nonce: base64.decode(pj.nonce),
      ciphertext: base64.decode(pj.ciphertext),
    } as MessageEncryptorPayload;
  } else {
    const buf = base64.decode(p);
    return {
      v: buf[0],
      nonce: buf.subarray(1, 25),
      ciphertext: buf.subarray(25),
    } as MessageEncryptorPayload;
  }
}

export function encodeEncryptionPayload(p: MessageEncryptorPayload) {
  return base64.encode(new Uint8Array([p.v, ...p.nonce, ...p.ciphertext]));
}
