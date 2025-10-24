export * from "./external-store";
export * from "./lnurl";
export * from "./utils";
export * from "./work-queue";
export * from "./feed-cache";
export * from "./invoices";
export * from "./dexie-like";
export * from "./SortedMap/SortedMap";
export * from "./const";
export * from "./tlv";

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
