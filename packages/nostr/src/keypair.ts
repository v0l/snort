import { bech32 } from "bech32"
import { ProtocolError } from "./error"
import * as secp from "@noble/secp256k1"

/**
 * A 32-byte secp256k1 public key.
 */
export class PublicKey {
  #hex: string

  /**
   * Expects the key encoded as an npub1-prefixed bech32 string, hex string, or byte buffer.
   */
  constructor(key: string | Uint8Array) {
    this.#hex = parseKey(key, "npub1")
    if (this.#hex.length !== 64) {
      throw new ProtocolError(`invalid pubkey: ${key}`)
    }
  }

  toString(): string {
    return this.#hex
  }
}

/**
 * A 32-byte secp256k1 private key.
 */
export class PrivateKey {
  #hex: string

  /**
   * Expects the key encoded as an nsec1-prefixed bech32 string, hex string, or byte buffer.
   */
  constructor(key: string | Uint8Array) {
    this.#hex = parseKey(key, "nsec1")
    if (this.#hex.length !== 64) {
      throw new ProtocolError(`invalid private key: ${this.#hex}`)
    }
  }

  get pubkey(): PublicKey {
    return new PublicKey(secp.schnorr.getPublicKey(this.#hex))
  }

  /**
   * The hex representation of the private key. Use with caution!
   */
  hexDangerous(): string {
    return this.#hex
  }
}

/**
 * Parse a key into its hex representation.
 */
function parseKey(key: string | Uint8Array, bechPrefix: string): string {
  if (typeof key === "string") {
    // Is the key encoded in bech32?
    if (key.startsWith(bechPrefix)) {
      const { words } = bech32.decode(key)
      const bytes = Uint8Array.from(bech32.fromWords(words))
      return secp.utils.bytesToHex(bytes).toLowerCase()
    }
    // If not, it must be lowercase hex.
    const valid = "0123456789abcdef"
    if (key.length % 2 != 0) {
      throw new ProtocolError(`invalid lowercase hex string: ${key}`)
    }
    for (const c of key) {
      if (!valid.includes(c)) {
        throw new ProtocolError(`invalid lowercase hex string: ${key}`)
      }
    }
    return key
  } else {
    return secp.utils.bytesToHex(key).toLowerCase()
  }
}
