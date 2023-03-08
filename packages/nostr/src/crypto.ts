import * as secp from "@noble/secp256k1"
import base64 from "base64-js"
import { bech32 } from "bech32"

// TODO Use toHex as well as toString? Might be more explicit
// Or maybe replace toString with toHex
// TODO Or maybe always store Uint8Array and properly use the format parameter passed into toString

/**
 * A lowercase hex string.
 */
export type Hex = string

/**
 * A public key encoded as hex.
 */
export type PublicKey = string

/**
 * A private key encoded as hex or bech32 with the "nsec" prefix.
 */
export type HexOrBechPublicKey = string

/**
 * A private key encoded as hex.
 */
export type PrivateKey = string

/**
 * A private key encoded as hex or bech32 with the "nsec" prefix.
 */
export type HexOrBechPrivateKey = string

/**
 * Get a public key corresponding to a private key.
 */
export function getPublicKey(priv: HexOrBechPrivateKey): PublicKey {
  priv = parsePrivateKey(priv)
  return toHex(secp.schnorr.getPublicKey(priv))
}

/**
 * Convert the data to lowercase hex.
 */
function toHex(data: Uint8Array): Hex {
  return secp.utils.bytesToHex(data).toLowerCase()
}

/**
 * Convert the public key to hex. Accepts a hex or bech32 string with the "npub" prefix.
 */
export function parsePublicKey(key: HexOrBechPublicKey): PublicKey {
  return parseKey(key, "npub")
}

/**
 * Convert the private key to hex. Accepts a hex or bech32 string with the "nsec" prefix.
 */
export function parsePrivateKey(key: HexOrBechPrivateKey): PrivateKey {
  return parseKey(key, "nsec")
}

/**
 * Convert a public or private key into its hex representation.
 */
function parseKey(key: string, bechPrefix: string): Hex {
  // If the key is bech32-encoded, decode it.
  if (key.startsWith(bechPrefix)) {
    const { words } = bech32.decode(key)
    const bytes = Uint8Array.from(bech32.fromWords(words))
    return toHex(bytes)
  }
  return key
}

/**
 * Get the SHA256 hash of the data, in hex format.
 */
export async function sha256(data: Uint8Array): Promise<Hex> {
  return toHex(await secp.utils.sha256(data))
}

/**
 * Sign the data using elliptic curve cryptography.
 */
export async function schnorrSign(data: Hex, priv: PrivateKey): Promise<Hex> {
  return toHex(await secp.schnorr.sign(data, priv))
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

export async function aesEncryptBase64(
  sender: PrivateKey,
  recipient: PublicKey,
  plaintext: string
): Promise<AesEncryptedBase64> {
  const sharedPoint = secp.getSharedSecret(sender, "02" + recipient)
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

export async function aesDecryptBase64(
  sender: PublicKey,
  recipient: PrivateKey,
  { data, iv }: AesEncryptedBase64
): Promise<string> {
  const sharedPoint = secp.getSharedSecret(recipient, "02" + sender)
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

interface AesEncryptedBase64 {
  data: string
  iv: string
}
