import { schnorr, secp256k1 } from "@noble/curves/secp256k1";
import { Nip4WebCryptoEncryptor } from "../src/impl/nip4";
import { Nip44Encryptor } from "../src/impl/nip44";
import { bytesToHex } from "@noble/curves/abstract/utils";

const aKey = secp256k1.utils.randomPrivateKey();
const aPubKey = schnorr.getPublicKey(aKey);
const bKey = secp256k1.utils.randomPrivateKey();
const bPubKey = schnorr.getPublicKey(bKey);

describe("NIP-04", () => {
  it("should encrypt/decrypt", async () => {
    const msg = "test hello, 123";
    const enc = new Nip4WebCryptoEncryptor();
    const sec = enc.getSharedSecret(bytesToHex(aKey), bytesToHex(bPubKey));

    const payload = await enc.encryptData(msg, sec);
    expect(payload).toHaveProperty("ciphertext");
    expect(payload).toHaveProperty("nonce");
    expect(payload.v).toBe(0);

    const dec = new Nip4WebCryptoEncryptor();
    const sec2 = enc.getSharedSecret(bytesToHex(bKey), bytesToHex(aPubKey));
    const plaintext = await dec.decryptData(payload, sec2);
    expect(plaintext).toEqual(msg);
  });
});

describe("NIP-44", () => {
  it("should encrypt/decrypt", () => {
    const msg = "test hello, 123";
    const enc = new Nip44Encryptor();
    const sec = enc.getSharedSecret(bytesToHex(aKey), bytesToHex(bPubKey));

    const payload = enc.encryptData(msg, sec);
    expect(payload).toHaveProperty("ciphertext");
    expect(payload).toHaveProperty("nonce");
    expect(payload.v).toBe(1);

    const dec = new Nip44Encryptor();
    const sec2 = enc.getSharedSecret(bytesToHex(bKey), bytesToHex(aPubKey));
    const plaintext = dec.decryptData(payload, sec2);
    expect(plaintext).toEqual(msg);
  });
});
