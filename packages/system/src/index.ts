import { RelaySettings } from "./connection";
import { RequestBuilder } from "./request-builder";
import { NostrEvent, OkResponse, ReqFilter, TaggedNostrEvent } from "./nostr";
import { ProfileLoaderService } from "./profile-cache";
import { AuthorsRelaysCache } from "./outbox";
import { RelayMetadataLoader } from "outbox/relay-loader";
import { Optimizer } from "./query-optimizer";
import { base64 } from "@scure/base";
import { CachedTable } from "@snort/shared";
import { ConnectionPool } from "./connection-pool";
import { EventEmitter } from "eventemitter3";
import { QueryEvents } from "./query";
import { CacheRelay } from "./cache-relay";
import { RequestRouter } from "./request-router";
import { UsersFollows } from "./cache/index";

export { NostrSystem } from "./nostr-system";
export { default as EventKind } from "./event-kind";
export { default as SocialGraph, socialGraphInstance } from "./SocialGraph/SocialGraph";
export * from "./SocialGraph/UniqueIds";
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
export * from "./impl/nip57";
export * from "./signer";
export * from "./text";
export * from "./pow";
export * from "./pow-util";
export * from "./query-optimizer";
export * from "./encrypted";
export * from "./outbox";
export * from "./sync";
export * from "./user-state";

export * from "./impl/nip4";
export * from "./impl/nip7";
export * from "./impl/nip10";
export * from "./impl/nip44";
export * from "./impl/nip46";
export * from "./impl/nip57";

export * from "./cache/index";
export * from "./cache/user-relays";
export * from "./cache/user-metadata";
export * from "./cache/relay-metric";

export type QueryLike = {
  get progress(): number;
  feed: {
    add: (evs: Array<TaggedNostrEvent>) => void;
    clear: () => void;
  };
  cancel: () => void;
  uncancel: () => void;
  get snapshot(): Array<TaggedNostrEvent>;
} & EventEmitter<QueryEvents>;

export interface SystemInterface {
  /**
   * Check event signatures (reccomended)
   */
  checkSigs: boolean;

  /**
   * Do some initialization
   * @param follows A follower list to preload content for
   */
  Init(follows?: Array<string>): Promise<void>;

  /**
   * Get an active query by ID
   * @param id Query ID
   */
  GetQuery(id: string): QueryLike | undefined;

  /**
   * Open a new query to relays
   * @param req Request to send to relays
   */
  Query(req: RequestBuilder): QueryLike;

  /**
   * Fetch data from nostr relays asynchronously
   * @param req Request to send to relays
   * @param cb A callback which will fire every 100ms when new data is received
   */
  Fetch(req: RequestBuilder, cb?: (evs: Array<TaggedNostrEvent>) => void): Promise<Array<TaggedNostrEvent>>;

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
   * Push an event into the system from external source
   */
  HandleEvent(subId: string, ev: TaggedNostrEvent): void;

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
  get profileLoader(): ProfileLoaderService;

  /**
   * Relay cache for "Gossip" model
   */
  get relayCache(): AuthorsRelaysCache;

  /**
   * Query optimizer
   */
  get optimizer(): Optimizer;

  /**
   * Generic cache store for events
   */
  get eventsCache(): CachedTable<NostrEvent>;

  /**
   * ContactList cache
   */
  get userFollowsCache(): CachedTable<UsersFollows>;

  /**
   * Relay loader loads relay metadata for a set of profiles
   */
  get relayLoader(): RelayMetadataLoader;

  /**
   * Main connection pool
   */
  get pool(): ConnectionPool;

  /**
   * Local relay cache service
   */
  get cacheRelay(): CacheRelay | undefined;

  /**
   * Request router instance
   */
  get requestRouter(): RequestRouter | undefined;
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

export function decodeEncryptionPayload(p: string): MessageEncryptorPayload {
  if (p.startsWith("{") && p.endsWith("}")) {
    const pj = JSON.parse(p) as { v: number; nonce: string; ciphertext: string };
    return {
      v: pj.v,
      nonce: base64.decode(pj.nonce),
      ciphertext: base64.decode(pj.ciphertext),
    };
  } else if (p.includes("?iv=")) {
    const [ciphertext, nonce] = p.split("?iv=");
    return {
      v: MessageEncryptorVersion.Nip4,
      nonce: base64.decode(nonce),
      ciphertext: base64.decode(ciphertext),
    };
  } else {
    const buf = base64.decode(p);
    return {
      v: buf[0],
      nonce: buf.subarray(1, 25),
      ciphertext: buf.subarray(25),
    };
  }
}

export function encodeEncryptionPayload(p: MessageEncryptorPayload) {
  return base64.encode(new Uint8Array([p.v, ...p.nonce, ...p.ciphertext]));
}
