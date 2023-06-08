import { RelaySettings } from "./Connection";

export interface NostrEvent {
  id: u256;
  pubkey: HexKey;
  created_at: number;
  kind: number;
  tags: Array<Array<string>>;
  content: string;
  sig: string;
}

export interface TaggedRawEvent extends NostrEvent {
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

export type ReqCommand = [cmd: "REQ", id: string, ...filters: Array<ReqFilter>];

/**
 * Raw REQ filter object
 */
export interface ReqFilter {
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
}

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
  Badges = "profile_badges",
}

export interface FullRelaySettings {
  url: string;
  settings: RelaySettings;
}
