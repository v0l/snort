import { HexKey, NostrEvent, UserMetadata } from "..";
import { hexToBech32, unixNowMs } from "../Util";

export interface MetadataCache extends UserMetadata {
  /**
   * When the object was saved in cache
   */
  loaded: number;

  /**
   * When the source metadata event was created
   */
  created: number;

  /**
   * The pubkey of the owner of this metadata
   */
  pubkey: HexKey;

  /**
   * The bech32 encoded pubkey
   */
  npub: string;

  /**
   * Pubkey of zapper service
   */
  zapService?: HexKey;

  /**
   * If the nip05 is valid for this user
   */
  isNostrAddressValid: boolean;
}

export function mapEventToProfile(ev: NostrEvent) {
  try {
    const data: UserMetadata = JSON.parse(ev.content);
    return {
      ...data,
      pubkey: ev.pubkey,
      npub: hexToBech32("npub", ev.pubkey),
      created: ev.created_at,
      loaded: unixNowMs(),
    } as MetadataCache;
  } catch (e) {
    console.error("Failed to parse JSON", ev, e);
  }
}

export interface CacheStore<T> {
  preload(): Promise<void>;
  getFromCache(key?: string): T | undefined;
  get(key?: string): Promise<T | undefined>;
  bulkGet(keys: Array<string>): Promise<Array<T>>;
  set(obj: T): Promise<void>;
  bulkSet(obj: Array<T>): Promise<void>;
  update<TCachedWithCreated extends T & { created: number; loaded: number }>(m: TCachedWithCreated): Promise<"new" | "updated" | "refresh" | "no_change">

  /**
   * Loads a list of rows from disk cache
   * @param keys List of ids to load
   * @returns Keys that do not exist on disk cache
   */
  buffer(keys: Array<string>): Promise<Array<string>>;

  clear(): Promise<void>;
}
