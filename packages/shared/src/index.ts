export * from "./external-store";
export * from "./lnurl";
export * from "./utils";
export * from "./work-queue";
export * from "./feed-cache";
export * from "./invoices";
export * from "./cache-store";
export * from "./SortedMap/SortedMap";
export * from "./const";
export * from "./tlv";
export * from "./imgproxy";

/**
 * Well-known nostr entity HRP's
 */
export enum NostrPrefix {
  PublicKey = "npub",
  PrivateKey = "nsec",
  Note = "note",

  // TLV prefixes
  Profile = "nprofile",
  Event = "nevent",
  Relay = "nrelay",
  Address = "naddr",
}

/**
 * Is the TLV encoded type 0 (special) a decoded hex string
 */
export function isPrefixTlvIdHex(prefix: NostrPrefix) {
  return [NostrPrefix.Event, NostrPrefix.Profile].includes(prefix);
}
