import { xchacha20 } from "@noble/ciphers/chacha.js"
import { equalBytes } from "@noble/ciphers/utils.js"
import { hkdf } from "@noble/hashes/hkdf.js"
import { hmac } from "@noble/hashes/hmac.js"
import { scryptAsync } from "@noble/hashes/scrypt.js"
import { sha256 } from "@noble/hashes/sha2.js"
import { bytesToHex, hexToBytes, randomBytes, utf8ToBytes } from "@noble/hashes/utils.js"
import { base64 } from "@scure/base"

export class InvalidPinError extends Error {
  constructor() {
    super()
  }
}

export abstract class KeyStorage {
  // Raw value
  abstract get value(): string

  /**
   * Is the storage locked
   */
  abstract shouldUnlock(): boolean

  abstract unlock(code: string): Promise<void>

  /**
   * Get a payload object which can be serialized to JSON
   */
  abstract toPayload(): Object

  /**
   * Create a key storage class from its payload
   */
  static fromPayload(o: object) {
    if ("raw" in o && typeof o.raw === "string") {
      return new NotEncrypted(o.raw)
    } else {
      return new PinEncrypted(o as unknown as PinEncryptedPayload)
    }
  }
}

/**
 * Pin protected data
 *
 * Encryption scheme (encrypt-then-MAC with key separation):
 *   masterKey  = scrypt(pin, salt)
 *   encKey     = HKDF(masterKey, salt, info="pin-enc")   — 32 bytes
 *   macKey     = HKDF(masterKey, salt, info="pin-mac")   — 32 bytes
 *   ciphertext = XChaCha20(encKey, nonce, plaintext)
 *   mac        = HMAC-SHA256(macKey, nonce || ciphertext) — verified before decryption
 */
export class PinEncrypted extends KeyStorage {
  static readonly #opts = { N: 2 ** 20, r: 8, p: 1, dkLen: 32 }
  #decrypted?: Uint8Array
  #encrypted: PinEncryptedPayload

  constructor(enc: PinEncryptedPayload) {
    super()
    this.#encrypted = enc
  }

  get value() {
    if (!this.#decrypted) throw new Error("Content has not been decrypted yet")
    return bytesToHex(this.#decrypted)
  }

  override shouldUnlock(): boolean {
    return !this.#decrypted
  }

  override async unlock(pin: string) {
    // Only the v2 (encrypt-then-MAC with key separation) format is supported.
    // Legacy v1 payloads (no `v` field) used MAC-then-encrypt with a shared key
    // and cannot be decrypted securely — they must be re-encrypted by the user.
    if (this.#encrypted.v !== 2) throw new InvalidPinError()

    let salt: Uint8Array, ciphertext: Uint8Array, nonce: Uint8Array, actualMac: Uint8Array
    try {
      salt = base64.decode(this.#encrypted.salt)
      ciphertext = base64.decode(this.#encrypted.ciphertext)
      nonce = base64.decode(this.#encrypted.iv)
      actualMac = base64.decode(this.#encrypted.mac)
    } catch {
      throw new InvalidPinError()
    }

    // Validate expected field lengths before any cryptographic operation
    if (salt.length !== 24 || nonce.length !== 24 || actualMac.length !== 32) throw new InvalidPinError()

    const masterKey = await scryptAsync(pin, salt, PinEncrypted.#opts)
    const encKey = hkdf(sha256, masterKey, salt, utf8ToBytes("pin-enc"), 32)
    const macKey = hkdf(sha256, masterKey, salt, utf8ToBytes("pin-mac"), 32)

    // Verify MAC over (nonce || ciphertext) before decryption — encrypt-then-MAC
    const macData = new Uint8Array(nonce.length + ciphertext.length)
    macData.set(nonce, 0)
    macData.set(ciphertext, nonce.length)
    const expectedMac = hmac(sha256, macKey, macData)
    if (!equalBytes(expectedMac, actualMac)) throw new InvalidPinError()

    let plaintext: Uint8Array
    try {
      plaintext = xchacha20(encKey, nonce, ciphertext)
    } catch {
      throw new InvalidPinError()
    }
    if (plaintext.length !== 32) throw new InvalidPinError()
    this.#decrypted = plaintext
  }

  toPayload() {
    return this.#encrypted
  }

  static async create(content: string, pin: string) {
    const plaintext = hexToBytes(content)
    if (plaintext.length !== 32) {
      throw new Error("PinEncrypted content must be exactly 32 bytes (64 hex characters)")
    }
    const salt = randomBytes(24)
    const nonce = randomBytes(24)
    const masterKey = await scryptAsync(pin, salt, PinEncrypted.#opts)
    const encKey = hkdf(sha256, masterKey, salt, utf8ToBytes("pin-enc"), 32)
    const macKey = hkdf(sha256, masterKey, salt, utf8ToBytes("pin-mac"), 32)

    // Encrypt first, then MAC over (nonce || ciphertext) — encrypt-then-MAC
    const ciphertext = xchacha20(encKey, nonce, plaintext)
    const macData = new Uint8Array(nonce.length + ciphertext.length)
    macData.set(nonce, 0)
    macData.set(ciphertext, nonce.length)
    const mac = base64.encode(hmac(sha256, macKey, macData))

    const ret = new PinEncrypted({
      v: 2,
      salt: base64.encode(salt),
      ciphertext: base64.encode(ciphertext),
      iv: base64.encode(nonce),
      mac,
    })
    ret.#decrypted = plaintext
    return ret
  }
}

export class NotEncrypted extends KeyStorage {
  #key: string

  constructor(key: string) {
    super()
    this.#key = key
  }

  get value() {
    return this.#key
  }

  override shouldUnlock(): boolean {
    return false
  }

  override unlock(code: string): Promise<void> {
    throw new Error("Method not implemented.")
  }

  override toPayload(): Object {
    return {
      raw: this.#key,
    }
  }
}

export interface PinEncryptedPayload {
  /** Format version. v2 = encrypt-then-MAC with HKDF key separation. Absence = legacy v1. */
  v?: number
  salt: string // for KDF
  ciphertext: string
  iv: string
  mac: string
}
