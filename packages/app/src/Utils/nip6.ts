import * as utils from "@noble/curves/abstract/utils";
import { HDKey } from "@scure/bip32";
import * as bip39 from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";

import { DerivationPath } from "@/Utils/Const";

export function generateBip39Entropy(mnemonic?: string): Uint8Array {
  try {
    const mn = mnemonic ?? bip39.generateMnemonic(wordlist, 256);
    return bip39.mnemonicToEntropy(mn, wordlist);
  } catch (e) {
    throw new Error("INVALID MNEMONIC PHRASE");
  }
}

/**
 * Convert hex-encoded entropy into mnemonic phrase
 */
export function hexToMnemonic(hex: string): string {
  const bytes = utils.hexToBytes(hex);
  return bip39.entropyToMnemonic(bytes, wordlist);
}

/**
 * Derrive NIP-06 private key from master key
 */
export function entropyToPrivateKey(entropy: Uint8Array): string {
  const masterKey = HDKey.fromMasterSeed(entropy);
  const newKey = masterKey.derive(DerivationPath);

  if (!newKey.privateKey) {
    throw new Error("INVALID KEY DERIVATION");
  }

  return utils.bytesToHex(newKey.privateKey);
}
