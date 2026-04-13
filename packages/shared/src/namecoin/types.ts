/** Namecoin NIP-05 identity resolution types */

export interface NamecoinNostrResult {
  /** Hex-encoded 32-byte Schnorr public key */
  pubkey: string
  /** Optional relay URLs where this user can be found */
  relays: string[]
  /** The Namecoin name that was resolved (e.g. "d/example") */
  namecoinName: string
  /** The local-part that was matched (e.g. "alice" or "_") */
  localPart: string
}

export interface NameShowResult {
  name: string
  value: string
  txid: string
  height: number
  expired: boolean
  expiresIn?: number
}

export interface NamecoinSettings {
  enabled: boolean
}

export interface ParsedIdentifier {
  namecoinName: string
  localPart: string
  namespace: Namespace
}

export enum Namespace {
  DOMAIN = "DOMAIN",
  IDENTITY = "IDENTITY",
}
