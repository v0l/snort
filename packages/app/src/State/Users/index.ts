import { HexKey, TaggedRawEvent, UserMetadata } from "@snort/nostr";
import { hexToBech32, unixNowMs } from "Util";

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
}

export function mapEventToProfile(ev: TaggedRawEvent) {
  try {
    const data: UserMetadata = JSON.parse(ev.content);
    return {
      pubkey: ev.pubkey,
      npub: hexToBech32("npub", ev.pubkey),
      created: ev.created_at,
      ...data,
      loaded: unixNowMs(),
    } as MetadataCache;
  } catch (e) {
    console.error("Failed to parse JSON", ev, e);
  }
}
