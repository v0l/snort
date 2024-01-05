import { RelaySettings } from "./connection";

export interface NostrEvent {
  id: u256;
  pubkey: HexKey;
  created_at: number;
  kind: number;
  tags: Array<Array<string>>;
  content: string;
  sig: string;
}

export interface TaggedNostrEvent extends NostrEvent {
  /**
   * A list of relays this event was seen on
   */
  relays: Array<string>;

  /**
   * Additional context
   */
  context?: object;
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
  "#a"?: string[];
  "#g"?: string[];
  search?: string;
  since?: number;
  until?: number;
  limit?: number;
  not?: ReqFilter;
  [key: string]: Array<string> | Array<number> | string | number | undefined;
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

export interface FullRelaySettings {
  url: string;
  settings: RelaySettings;
}

export type NotSignedNostrEvent = Omit<NostrEvent, "sig">;

export interface IMeta {
  magnet?: string;
  sha256?: string;
  blurHash?: string;
  height?: number;
  width?: number;
  alt?: string;
  fallback?: Array<string>;
}
