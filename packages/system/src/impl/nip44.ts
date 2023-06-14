import { MessageEncryptor } from "index";

import { base64 } from "@scure/base";
import { randomBytes } from '@noble/hashes/utils'
import { streamXOR as xchacha20 } from '@stablelib/xchacha20'
import { secp256k1 } from "@noble/curves/secp256k1";
import { sha256 } from '@noble/hashes/sha256'

export enum Nip44Version {
    Reserved = 0x00,
    XChaCha20 = 0x01
}

export class Nip44Encryptor implements MessageEncryptor {
    getSharedSecret(privateKey: string, publicKey: string) {
        const key = secp256k1.getSharedSecret(privateKey, '02' + publicKey)
        return sha256(key.slice(1, 33));
    }

    encryptData(content: string, sharedSecret: Uint8Array) {
        const nonce = randomBytes(24)
        const plaintext = new TextEncoder().encode(content)
        const ciphertext = xchacha20(sharedSecret, nonce, plaintext, plaintext);
        const ctb64 = base64.encode(Uint8Array.from(ciphertext))
        const nonceb64 = base64.encode(nonce)
        return JSON.stringify({ ciphertext: ctb64, nonce: nonceb64, v: Nip44Version.XChaCha20 })
    }

    decryptData(cyphertext: string, sharedSecret: Uint8Array) {
        const dt = JSON.parse(cyphertext)
        if (dt.v !== 1) throw new Error('NIP44: unknown encryption version')

        const ciphertext = base64.decode(dt.ciphertext)
        const nonce = base64.decode(dt.nonce)
        const plaintext = xchacha20(sharedSecret, nonce, ciphertext, ciphertext)
        const text = new TextDecoder().decode(plaintext)
        return text;
    }

}