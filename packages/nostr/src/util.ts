import * as secp from "@noble/secp256k1"
import { ProtocolError } from "./error"

/**
 * Check that the input is a valid lowercase hex string.
 */
export function parseHex(hex: string | Uint8Array): string {
  if (typeof hex === "string") {
    const valid = "0123456789abcdef"
    if (hex.length % 2 != 0) {
      throw new ProtocolError(`invalid hex string: ${hex}`)
    }
    for (const c of hex) {
      if (!valid.includes(c)) {
        throw new ProtocolError(`invalid hex string: ${hex}`)
      }
    }
    return hex
  } else {
    return secp.utils.bytesToHex(hex).toLowerCase()
  }
}
