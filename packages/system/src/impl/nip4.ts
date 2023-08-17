import { MessageEncryptor, MessageEncryptorPayload, MessageEncryptorVersion } from "index";
import { secp256k1 } from "@noble/curves/secp256k1";

export class Nip4WebCryptoEncryptor implements MessageEncryptor {
  getSharedSecret(privateKey: string, publicKey: string) {
    const sharedPoint = secp256k1.getSharedSecret(privateKey, "02" + publicKey);
    const sharedX = sharedPoint.slice(1, 33);
    return sharedX;
  }

  async encryptData(content: string, sharedSecet: Uint8Array) {
    const key = await this.#importKey(sharedSecet);
    const iv = window.crypto.getRandomValues(new Uint8Array(16));
    const data = new TextEncoder().encode(content);
    const result = await window.crypto.subtle.encrypt(
      {
        name: "AES-CBC",
        iv: iv,
      },
      key,
      data,
    );
    return {
      ciphertext: new Uint8Array(result),
      nonce: iv,
      v: MessageEncryptorVersion.Nip4,
    } as MessageEncryptorPayload;
  }

  async decryptData(payload: MessageEncryptorPayload, sharedSecet: Uint8Array) {
    const key = await this.#importKey(sharedSecet);
    const result = await window.crypto.subtle.decrypt(
      {
        name: "AES-CBC",
        iv: payload.nonce,
      },
      key,
      payload.ciphertext,
    );
    return new TextDecoder().decode(result);
  }

  async #importKey(sharedSecet: Uint8Array) {
    return await window.crypto.subtle.importKey("raw", sharedSecet, { name: "AES-CBC" }, false, ["encrypt", "decrypt"]);
  }
}
