export const enum MessageEncryptorVersion {
  Nip4 = 0,
  Nip44 = 1,
}

export interface MessageEncryptor {
  encryptData(plaintext: string): Promise<string> | string;
  decryptData(ciphertext: string): Promise<string> | string;
}
