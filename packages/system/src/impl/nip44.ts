import { nip44 } from "../encryption/nip44";
import type { MessageEncryptor } from "..";

export class Nip44Encryptor implements MessageEncryptor {
  constructor(
    readonly privateKey: string,
    readonly publicKey: string,
  ) {}

  encryptData(plaintext: string) {
    const conversationKey = nip44.v2.getConversationKey(this.privateKey, this.publicKey);
    return nip44.v2.encrypt(plaintext, conversationKey);
  }

  decryptData(payload: string): string {
    const { version, ciphertext, nonce, mac } = nip44.utils.decodePayload(payload);
    if (version === 1) {
      const conversationKey = nip44.v1.getConversationKey(this.privateKey, this.publicKey);
      return nip44.v1.decrypt(ciphertext, nonce, conversationKey);
    }
    if (version === 2) {
      const conversationKey = nip44.v2.getConversationKey(this.privateKey, this.publicKey);
      return nip44.v2.decrypt(ciphertext, nonce, mac!, conversationKey);
    }
    throw new Error(`Unsupported payload version: ${version}`);
  }
}
