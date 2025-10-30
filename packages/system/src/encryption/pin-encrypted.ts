import { scryptAsync } from "@noble/hashes/scrypt.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { hmac } from "@noble/hashes/hmac.js";
import { bytesToHex, hexToBytes, randomBytes } from "@noble/hashes/utils.js";
import { base64 } from "@scure/base";
import { streamXOR as xchacha20 } from "@stablelib/xchacha20";

export class InvalidPinError extends Error {
  constructor() {
    super();
  }
}

export abstract class KeyStorage {
  // Raw value
  abstract get value(): string;

  /**
   * Is the storage locked
   */
  abstract shouldUnlock(): boolean;

  abstract unlock(code: string): Promise<void>;

  /**
   * Get a payload object which can be serialized to JSON
   */
  abstract toPayload(): Object;

  /**
   * Create a key storage class from its payload
   */
  static fromPayload(o: object) {
    if ("raw" in o && typeof o.raw === "string") {
      return new NotEncrypted(o.raw);
    } else {
      return new PinEncrypted(o as unknown as PinEncryptedPayload);
    }
  }
}

/**
 * Pin protected data
 */
export class PinEncrypted extends KeyStorage {
  static readonly #opts = { N: 2 ** 20, r: 8, p: 1, dkLen: 32 };
  #decrypted?: Uint8Array;
  #encrypted: PinEncryptedPayload;

  constructor(enc: PinEncryptedPayload) {
    super();
    this.#encrypted = enc;
  }

  get value() {
    if (!this.#decrypted) throw new Error("Content has not been decrypted yet");
    return bytesToHex(this.#decrypted);
  }

  override shouldUnlock(): boolean {
    return !this.#decrypted;
  }

  override async unlock(pin: string) {
    const key = await scryptAsync(pin, base64.decode(this.#encrypted.salt), PinEncrypted.#opts);
    const ciphertext = base64.decode(this.#encrypted.ciphertext);
    const nonce = base64.decode(this.#encrypted.iv);
    const plaintext = xchacha20(key, nonce, ciphertext, new Uint8Array(32));
    if (plaintext.length !== 32) throw new InvalidPinError();
    const mac = base64.encode(hmac(sha256, key, plaintext));
    if (mac !== this.#encrypted.mac) throw new InvalidPinError();
    this.#decrypted = plaintext;
  }

  toPayload() {
    return this.#encrypted;
  }

  static async create(content: string, pin: string) {
    const salt = randomBytes(24);
    const nonce = randomBytes(24);
    const plaintext = hexToBytes(content);
    const key = await scryptAsync(pin, salt, PinEncrypted.#opts);
    const mac = base64.encode(hmac(sha256, key, plaintext));
    const ciphertext = xchacha20(key, nonce, plaintext, new Uint8Array(32));
    const ret = new PinEncrypted({
      salt: base64.encode(salt),
      ciphertext: base64.encode(ciphertext),
      iv: base64.encode(nonce),
      mac,
    });
    ret.#decrypted = plaintext;
    return ret;
  }
}

export class NotEncrypted extends KeyStorage {
  #key: string;

  constructor(key: string) {
    super();
    this.#key = key;
  }

  get value() {
    return this.#key;
  }

  override shouldUnlock(): boolean {
    return false;
  }

  override unlock(code: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  override toPayload(): Object {
    return {
      raw: this.#key,
    };
  }
}

export interface PinEncryptedPayload {
  salt: string; // for KDF
  ciphertext: string;
  iv: string;
  mac: string;
}
