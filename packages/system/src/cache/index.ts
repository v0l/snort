import type { FullRelaySettings, NostrEvent, UserMetadata } from "..";
import { unixNowMs } from "@snort/shared";

export interface CachedBase {
  /**
   * When the object was saved in cache
   */
  loaded: number;

  /**
   * When the source data event was created
   */
  created: number;

  /**
   * The pubkey of the owner of this data
   */
  pubkey: string;
}

export type CachedMetadata = CachedBase & UserMetadata;

export type UsersRelays = {
  relays: FullRelaySettings[];
} & CachedBase;

export type UsersFollows = {
  follows: Array<Array<string>>;
} & CachedBase;

export function mapEventToProfile(ev: NostrEvent) {
  if (ev.kind !== 0 && ev.kind !== 31990) return;
  try {
    const data: UserMetadata = JSON.parse(ev.content);
    const ret = {
      ...data,
      pubkey: ev.pubkey,
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
