import { bytesToHex } from "@noble/curves/abstract/utils";
import { getPublicKey } from "@snort/shared";
import { EventExt } from "./event-ext";
import { Nip4WebCryptoEncryptor } from "./impl/nip4";
import { XChaCha20Encryptor } from "./impl/nip44";
import { MessageEncryptorPayload, MessageEncryptorVersion } from "./index";
import { NostrEvent } from "./nostr";
import { base64 } from "@scure/base";

export interface EventSigner {
  init(): Promise<void>;
  getPubKey(): Promise<string> | string;
  nip4Encrypt(content: string, key: string): Promise<string>;
  nip4Decrypt(content: string, otherKey: string): Promise<string>;
  nip44Encrypt(content: string, key: string): Promise<string>;
  nip44Decrypt(content: string, otherKey: string): Promise<string>;
  sign(ev: NostrEvent): Promise<NostrEvent>;
}

export class PrivateKeySigner implements EventSigner {
  #publicKey: string;
  #privateKey: string;

  constructor(privateKey: string | Uint8Array) {
    if (typeof privateKey === "string") {
      this.#privateKey = privateKey;
    } else {
      this.#privateKey = bytesToHex(privateKey);
    }
    this.#publicKey = getPublicKey(this.#privateKey);
  }

  get privateKey() {
    return this.#privateKey;
  }

  init(): Promise<void> {
    return Promise.resolve();
  }

  getPubKey(): string {
    return this.#publicKey;
  }

  async nip4Encrypt(content: string, key: string) {
    const enc = new Nip4WebCryptoEncryptor();
    const secret = enc.getSharedSecret(this.privateKey, key);
    const data = await enc.encryptData(content, secret);
    return `${base64.encode(data.ciphertext)}?iv=${base64.encode(data.nonce)}`;
  }

  async nip4Decrypt(content: string, otherKey: string) {
    const enc = new Nip4WebCryptoEncryptor();
    const secret = enc.getSharedSecret(this.privateKey, otherKey);
    const [ciphertext, iv] = content.split("?iv=");
    return await enc.decryptData(
      {
        ciphertext: base64.decode(ciphertext),
        nonce: base64.decode(iv),
        v: MessageEncryptorVersion.Nip4,
      },
      secret,
    );
  }

  async nip44Encrypt(content: string, key: string) {
    const enc = new XChaCha20Encryptor();
    const shared = enc.getSharedSecret(this.#privateKey, key);
    const data = enc.encryptData(content, shared);
    return this.#encodePayload(data);
  }

  async nip44Decrypt(content: string, otherKey: string) {
    const payload = this.#decodePayload(content);
    if (payload.v !== MessageEncryptorVersion.XChaCha20) throw new Error("Invalid payload version");

    const enc = new XChaCha20Encryptor();
    const shared = enc.getSharedSecret(this.#privateKey, otherKey);
    return enc.decryptData(payload, shared);
  }

  #decodePayload(p: string) {
    if (p.startsWith("{") && p.endsWith("}")) {
      const pj = JSON.parse(p) as { v: number; nonce: string; ciphertext: string };
      return {
        v: pj.v,
        nonce: base64.decode(pj.nonce),
        ciphertext: base64.decode(pj.ciphertext),
      } as MessageEncryptorPayload;
    } else {
      const buf = base64.decode(p);
      return {
        v: buf[0],
        nonce: buf.subarray(1, 25),
        ciphertext: buf.subarray(25),
      } as MessageEncryptorPayload;
    }
  }

  #encodePayload(p: MessageEncryptorPayload) {
    return base64.encode(new Uint8Array([p.v, ...p.nonce, ...p.ciphertext]));
  }

  sign(ev: NostrEvent): Promise<NostrEvent> {
    EventExt.sign(ev, this.#privateKey);
    return Promise.resolve(ev);
  }
}
