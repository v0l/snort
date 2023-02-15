import { ProtocolError } from "./error"
import { parseHex } from "./util"

/**
 * A 32-byte secp256k1 public key.
 */
export class PublicKey {
  #hex: string

  constructor(hex: string | Uint8Array) {
    this.#hex = parseHex(hex)
    if (this.#hex.length !== 64) {
      throw new ProtocolError(`invalid pubkey: ${hex}`)
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

  constructor(hex: string | Uint8Array) {
    this.#hex = parseHex(hex)
    if (this.#hex.length !== 64) {
      throw new ProtocolError(`invalid private key: ${this.#hex}`)
    }
  }

  toString(): string {
    return this.#hex
  }
}
