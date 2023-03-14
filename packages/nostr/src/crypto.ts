import * as secp from "@noble/secp256k1"
import { ProtocolError } from "./error"
import base64 from "base64-js"
import { bech32 } from "bech32"

// TODO Use toHex as well as toString? Might be more explicit
// Or maybe replace toString with toHex
// TODO Or maybe always store Uint8Array and properly use the format parameter passed into toString

/**
 * A 32-byte secp256k1 public key.
 */
export class PublicKey {
  #hex: Hex

  /**
   * Expects the key encoded as an npub-prefixed bech32 string, lowercase hex string, or byte buffer.
   */
  constructor(key: string | Uint8Array) {
    this.#hex = parseKey(key, "npub1")
    if (this.#hex.toString().length !== 64) {
      throw new ProtocolError(`invalid pubkey: ${key}`)
    }
  }

  toHex(): string {
    return this.#hex.toString()
  }

  toString(): string {
    return this.toHex()
  }
}

/**
 * A 32-byte secp256k1 private key.
 */
export class PrivateKey {
  #hex: Hex

  /**
   * Expects the key encoded as an nsec-prefixed bech32 string, lowercase hex string, or byte buffer.
   */
  constructor(key: string | Uint8Array) {
    this.#hex = parseKey(key, "nsec1")
    if (this.#hex.toString().length !== 64) {
      throw new ProtocolError(`invalid private key: ${this.#hex}`)
    }
  }

  get pubkey(): PublicKey {
    return new PublicKey(secp.schnorr.getPublicKey(this.#hex.toString()))
  }

  /**
   * The hex representation of the private key. Use with caution!
   */
  toHexDangerous(): string {
    return this.#hex.toString()
  }

  toString(): string {
    return "PrivateKey"
  }
}

/**
 * Parse a public or private key into its hex representation.
 */
function parseKey(key: string | Uint8Array, bechPrefix: string): Hex {
  if (typeof key === "string") {
    // If the key is bech32-encoded, decode it.
    if (key.startsWith(bechPrefix)) {
      const { words } = bech32.decode(key)
      const bytes = Uint8Array.from(bech32.fromWords(words))
      return new Hex(bytes)
    }
  }
  return new Hex(key)
}

/**
 * Get the SHA256 hash of the data.
 */
export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  return await secp.utils.sha256(data)
}

/**
 * Sign the data using elliptic curve cryptography.
 */
export async function schnorrSign(
  data: Hex,
  key: PrivateKey
): Promise<Uint8Array> {
  return secp.schnorr.sign(data.toString(), key.toHexDangerous())
}

/**
 * Verify that the elliptic curve signature is correct.
 */
export async function schnorrVerify(
  sig: Hex,
  data: Hex,
  key: PublicKey
): Promise<boolean> {
  return secp.schnorr.verify(sig.toString(), data.toString(), key.toString())
}

interface AesEncryptedBase64 {
  data: string
  iv: string
}

export async function aesEncryptBase64(
  sender: PrivateKey,
  recipient: PublicKey,
  plaintext: string
): Promise<AesEncryptedBase64> {
  const sharedPoint = secp.getSharedSecret(
    sender.toHexDangerous(),
    "02" + recipient.toHex()
  )
  const sharedKey = sharedPoint.slice(2, 33)
  if (typeof window === "object") {
    const key = await window.crypto.subtle.importKey(
      "raw",
      sharedKey,
      { name: "AES-CBC" },
      false,
      ["encrypt", "decrypt"]
    )
    const iv = window.crypto.getRandomValues(new Uint8Array(16))
    const data = new TextEncoder().encode(plaintext)
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: "AES-CBC",
        iv,
      },
      key,
      data
    )
    return {
      data: base64.fromByteArray(new Uint8Array(encrypted)),
      iv: base64.fromByteArray(iv),
    }
  } else {
    const crypto = await import("crypto")
    const iv = crypto.randomFillSync(new Uint8Array(16))
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      // TODO If this code is correct, also fix the example code
      // TODO I also this that the slice() above is incorrect because the author
      // thought this was hex but it's actually bytes so should take 32 bytes not 64
      // TODO Actually it's probably cleanest to leave out the end of the slice completely, if possible, and it should be
      Buffer.from(sharedKey),
      iv
    )
    let encrypted = cipher.update(plaintext, "utf8", "base64")
    // TODO Could save an allocation here by avoiding the +=
    encrypted += cipher.final()
    return {
      data: encrypted,
      iv: Buffer.from(iv.buffer).toString("base64"),
    }
  }
}

// TODO
export async function aesDecryptBase64(
  sender: PublicKey,
  recipient: PrivateKey,
  { data, iv }: AesEncryptedBase64
): Promise<string> {
  const sharedPoint = secp.getSharedSecret(
    recipient.toHexDangerous(),
    "02" + sender.toHex()
  )
  const sharedKey = sharedPoint.slice(2, 33)
  if (typeof window === "object") {
    // TODO Can copy this from the legacy code
    throw new Error("todo")
  } else {
    const crypto = await import("crypto")
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(sharedKey),
      base64.toByteArray(iv)
    )
    const plaintext = decipher.update(data, "base64", "utf8")
    return plaintext + decipher.final()
  }
}

/**
 * A string in lowercase hex. This type is not available to the users of the library.
 */
export class Hex {
  #value: string

  /**
   * Passing a non-lowercase or non-hex string to the constructor
   * results in an error being thrown.
   */
  constructor(value: string | Uint8Array) {
    if (value instanceof Uint8Array) {
      value = secp.utils.bytesToHex(value).toLowerCase()
    }
    if (value.length % 2 != 0) {
      throw new ProtocolError(`invalid lowercase hex string: ${value}`)
    }
    const valid = "0123456789abcdef"
    for (const c of value) {
      if (!valid.includes(c)) {
        throw new ProtocolError(`invalid lowercase hex string: ${value}`)
      }
    }
    this.#value = value
  }

  toString(): string {
    return this.#value
  }
}
