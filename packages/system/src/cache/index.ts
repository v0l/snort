import { FullRelaySettings, HexKey, NostrEvent, UserMetadata } from "..";
import { hexToBech32, unixNowMs, DexieTableLike } from "@snort/shared";

export interface CachedMetadata extends UserMetadata {
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

export interface RelayMetrics {
  addr: string;
  events: number;
  connects: number;
  lastSeen: number;
  disconnects: number;
  latency: number[];
}

export interface UsersRelays {
  pubkey: string;
  relays: FullRelaySettings[];
  created: number;
  loaded: number;
}

export function mapEventToProfile(ev: NostrEvent) {
  if (ev.kind !== 0) return;
  try {
    const data: UserMetadata = JSON.parse(ev.content);
    let ret = {
      ...data,
      pubkey: ev.pubkey,
      npub: hexToBech32("npub", ev.pubkey),
      created: ev.created_at,
      loaded: unixNowMs(),
    } as CachedMetadata;

    // sanitize non-string/number
    for (const [k, v] of Object.entries(ret)) {
      if (typeof v !== "number" && typeof v !== "string") {
        (ret as any)[k] = undefined;
      }
    }
    return ret;
  } catch (e) {
    console.error("Failed to parse JSON", ev, e);
  }
}

export interface SnortSystemDb {
  users: DexieTableLike<CachedMetadata>;
  relayMetrics: DexieTableLike<RelayMetrics>;
  userRelays: DexieTableLike<UsersRelays>;
  events: DexieTableLike<NostrEvent>;

  isAvailable(): Promise<boolean>;
}
