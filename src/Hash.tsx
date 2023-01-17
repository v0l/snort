import * as secp from "@noble/secp256k1";
import { sha256 as hash } from '@noble/hashes/sha256';

export const sha256 = (str: string) => {
  return secp.utils.bytesToHex(hash(secp.utils.hexToBytes(str)))
}
