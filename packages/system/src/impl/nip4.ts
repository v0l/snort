import { MessageEncryptor } from "index";

import { base64 } from "@scure/base";
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
      data
    );
    const uData = new Uint8Array(result);
    return `${base64.encode(uData)}?iv=${base64.encode(iv)}`;
  }

  /**
   * Decrypt the content of the message
   */
  async decryptData(cyphertext: string, sharedSecet: Uint8Array) {
    const key = await this.#importKey(sharedSecet);
    const cSplit = cyphertext.split("?iv=");
    const data = base64.decode(cSplit[0]);
    const iv = base64.decode(cSplit[1]);

    const result = await window.crypto.subtle.decrypt(
      {
        name: "AES-CBC",
        iv: iv,
      },
      key,
      data
    );
    return new TextDecoder().decode(result);
  }

  async #importKey(sharedSecet: Uint8Array) {
    return await window.crypto.subtle.importKey("raw", sharedSecet, { name: "AES-CBC" }, false, ["encrypt", "decrypt"]);
  }
}
