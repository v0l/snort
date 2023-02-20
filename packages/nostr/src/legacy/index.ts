export * from "./Connection";
export { default as EventKind } from "./EventKind";
export { Subscriptions } from "./Subscriptions";
export { default as Event } from "./Event";
export { default as Tag } from "./Tag";
export * from "./Links";

export type RawEvent = {
  id: u256;
  pubkey: HexKey;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
};

export interface TaggedRawEvent extends RawEvent {
  /**
   * A list of relays this event was seen on
   */
  relays: string[];
}

/**
 * Basic raw key as hex
 */
export type HexKey = string;

/**
 * Optional HexKey
 */
export type MaybeHexKey = HexKey | undefined;

/**
 * A 256bit hex id
 */
export type u256 = string;

/**
 * Raw REQ filter object
 */
export type RawReqFilter = {
  ids?: u256[];
  authors?: u256[];
  kinds?: number[];
  "#e"?: u256[];
  "#p"?: u256[];
  "#t"?: string[];
  "#d"?: string[];
  "#r"?: string[];
  search?: string;
  since?: number;
  until?: number;
  limit?: number;
};

/**
 * Medatadata event content
 */
export type UserMetadata = {
  name?: string;
  display_name?: string;
  about?: string;
  picture?: string;
  website?: string;
  banner?: string;
  nip05?: string;
  lud06?: string;
  lud16?: string;
};

/**
 * NIP-51 list types
 */
export enum Lists {
  Muted = "mute",
  Pinned = "pin",
  Bookmarked = "bookmark",
  Followed = "follow",
}

export interface FullRelaySettings {
  url: string;
  settings: { read: boolean; write: boolean };
}
