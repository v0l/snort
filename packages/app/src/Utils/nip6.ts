import * as utils from "@noble/curves/abstract/utils";
import { bytesToHex } from "@noble/hashes/utils";
import { HDKey } from "@scure/bip32";
import * as bip39 from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";

/**
 * NIP06-defined derivation path for private keys
 */
export const DerivationPath = "m/44'/1237'/0'/0/0";

export function generateBip39Entropy(mnemonic?: string) {
  try {
    const mn = mnemonic ?? bip39.generateMnemonic(wordlist, 256);
    return bip39.mnemonicToEntropy(mn, wordlist);
  } catch (e) {
    throw new Error("INVALID MNEMONIC PHRASE");
  }
}

/**
 * Convert hex-encoded seed into mnemonic phrase
 */
export function seedToMnemonic(hex: string) {
  const bytes = utils.hexToBytes(hex);
  return bip39.entropyToMnemonic(bytes, wordlist);
}

/**
 * Derrive NIP-06 private key from master key
 */
export function seedToPrivateKey(seed: Uint8Array) {
  const masterKey = HDKey.fromMasterSeed(seed);
  const newKey = masterKey.derive(DerivationPath);

  if (!newKey.privateKey) {
    throw new Error("INVALID KEY DERIVATION");
  }

  return utils.bytesToHex(newKey.privateKey);
}

export async function entropyToPrivateKey(entropy: Uint8Array) {
  const mm = bip39.entropyToMnemonic(entropy, wordlist);
  const seed = await bip39.mnemonicToSeed(mm);
  const masterKey = HDKey.fromMasterSeed(seed);
  const newKey = masterKey.derive(DerivationPath);

  if (!newKey.privateKey) {
    throw new Error("INVALID KEY DERIVATION");
  }

  return bytesToHex(newKey.privateKey);
}
