import { MessageEncryptor, MessageEncryptorPayload, MessageEncryptorVersion } from "index";

import { base64 } from "@scure/base";
import { randomBytes } from "@noble/hashes/utils";
import { streamXOR as xchacha20 } from "@stablelib/xchacha20";
import { secp256k1 } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha256";

export class XChaCha20Encryptor implements MessageEncryptor {
  getSharedSecret(privateKey: string, publicKey: string) {
    const key = secp256k1.getSharedSecret(privateKey, "02" + publicKey);
    return sha256(key.slice(1, 33));
  }

  encryptData(content: string, sharedSecret: Uint8Array) {
    const nonce = randomBytes(24);
    const plaintext = new TextEncoder().encode(content);
    const ciphertext = xchacha20(sharedSecret, nonce, plaintext, plaintext);
    return {
      ciphertext: Uint8Array.from(ciphertext),
      nonce: nonce,
      v: MessageEncryptorVersion.XChaCha20,
    } as MessageEncryptorPayload;
  }

  decryptData(payload: MessageEncryptorPayload, sharedSecret: Uint8Array) {
    if (payload.v !== MessageEncryptorVersion.XChaCha20) throw new Error("NIP44: wrong encryption version");

    const dst = xchacha20(sharedSecret, payload.nonce, payload.ciphertext, payload.ciphertext);
    const decoded = new TextDecoder().decode(dst);
    return decoded;
  }
}
