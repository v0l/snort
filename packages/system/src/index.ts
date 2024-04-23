import { base64 } from "@scure/base";

export { NostrSystem } from "./nostr-system";
export { NDKSystem } from "./ndk-system";
export { default as EventKind } from "./event-kind";
export { default as SocialGraph, socialGraphInstance } from "./SocialGraph/SocialGraph";
export * from "./system";
export * from "./SocialGraph/UniqueIds";
export * from "./nostr";
export * from "./links";
export * from "./nips";
export * from "./relay-info";
export * from "./event-ext";
export * from "./connection";
export * from "./note-collection";
export * from "./request-builder";
export * from "./event-publisher";
export * from "./event-builder";
export * from "./nostr-link";
export * from "./profile-cache";
export * from "./impl/nip57";
export * from "./signer";
export * from "./text";
export * from "./pow";
export * from "./pow-util";
export * from "./query-optimizer";
export * from "./encrypted";
export * from "./outbox";
export * from "./sync";
export * from "./user-state";

export * from "./impl/nip4";
export * from "./impl/nip7";
export * from "./impl/nip10";
export * from "./impl/nip44";
export * from "./impl/nip46";
export * from "./impl/nip57";

export * from "./cache/index";
export * from "./cache/user-relays";
export * from "./cache/user-metadata";
export * from "./cache/relay-metric";

export const enum MessageEncryptorVersion {
  Nip4 = 0,
  XChaCha20 = 1,
}

export interface MessageEncryptorPayload {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  v: MessageEncryptorVersion;
}

export interface MessageEncryptor {
  getSharedSecret(privateKey: string, publicKey: string): Promise<Uint8Array> | Uint8Array;
  encryptData(plaintext: string, sharedSecet: Uint8Array): Promise<MessageEncryptorPayload> | MessageEncryptorPayload;
  decryptData(payload: MessageEncryptorPayload, sharedSecet: Uint8Array): Promise<string> | string;
}

export function decodeEncryptionPayload(p: string): MessageEncryptorPayload {
  if (p.startsWith("{") && p.endsWith("}")) {
    const pj = JSON.parse(p) as { v: number; nonce: string; ciphertext: string };
    return {
      v: pj.v,
      nonce: base64.decode(pj.nonce),
      ciphertext: base64.decode(pj.ciphertext),
    };
  } else if (p.includes("?iv=")) {
    const [ciphertext, nonce] = p.split("?iv=");
    return {
      v: MessageEncryptorVersion.Nip4,
      nonce: base64.decode(nonce),
      ciphertext: base64.decode(ciphertext),
    };
  } else {
    const buf = base64.decode(p);
    return {
      v: buf[0],
      nonce: buf.subarray(1, 25),
      ciphertext: buf.subarray(25),
    };
  }
}

export function encodeEncryptionPayload(p: MessageEncryptorPayload) {
  return base64.encode(new Uint8Array([p.v, ...p.nonce, ...p.ciphertext]));
}
