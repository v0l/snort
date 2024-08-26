import { MessageEncryptor, MessageEncryptorVersion } from "..";
import { secp256k1 } from "@noble/curves/secp256k1";
import { base64 } from "@scure/base";

export class Nip4WebCryptoEncryptor implements MessageEncryptor {
  #sharedSecret?: CryptoKey;
  constructor(
    readonly privKey: string,
    readonly pubKey: string,
  ) {}

  getSharedSecret(privateKey: string, publicKey: string) {
    const sharedPoint = secp256k1.getSharedSecret(privateKey, "02" + publicKey);
    const sharedX = sharedPoint.slice(1, 33);
    return sharedX;
  }

  async encryptData(content: string) {
    if (!this.#sharedSecret) {
      this.#sharedSecret = await this.#importKey(this.getSharedSecret(this.privKey, this.pubKey));
    }
    const iv = window.crypto.getRandomValues(new Uint8Array(16));
    const data = new TextEncoder().encode(content);
    const result = await window.crypto.subtle.encrypt(
      {
        name: "AES-CBC",
        iv: iv,
      },
      this.#sharedSecret,
      data,
    );
    return `${base64.encode(new Uint8Array(result))}?iv=${base64.encode(iv)}`;
  }

  async decryptData(payload: string) {
    if (!this.#sharedSecret) {
      this.#sharedSecret = await this.#importKey(this.getSharedSecret(this.privKey, this.pubKey));
    }
    const [ciphertext, nonce] = payload.split("?iv=");
    const result = await window.crypto.subtle.decrypt(
      {
        name: "AES-CBC",
        iv: base64.decode(nonce),
      },
      this.#sharedSecret,
      base64.decode(ciphertext),
    );
    return new TextDecoder().decode(result);
  }

  async #importKey(sharedSecet: Uint8Array) {
    return await window.crypto.subtle.importKey("raw", sharedSecet, { name: "AES-CBC" }, false, ["encrypt", "decrypt"]);
  }
}
