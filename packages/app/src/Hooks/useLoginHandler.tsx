import { useIntl } from "react-intl";

import { EmailRegex, MnemonicRegex } from "Const";
import { LoginSessionType, LoginStore } from "Login";
import { generateBip39Entropy, entropyToPrivateKey } from "nip6";
import { getNip05PubKey } from "Pages/LoginPage";
import { bech32ToHex } from "SnortUtils";
import { Nip7Signer, Nip46Signer } from "@snort/system";

export default function useLoginHandler() {
  const { formatMessage } = useIntl();
  const hasSubtleCrypto = window.crypto.subtle !== undefined;

  async function doLogin(key: string) {
    const insecureMsg = formatMessage({
      defaultMessage:
        "Can't login with private key on an insecure connection, please use a Nostr key manager extension instead",
    });
    if (key.startsWith("nsec")) {
      if (!hasSubtleCrypto) {
        throw new Error(insecureMsg);
      }
      const hexKey = bech32ToHex(key);
      if (hexKey.length === 64) {
        LoginStore.loginWithPrivateKey(hexKey);
      } else {
        throw new Error("INVALID PRIVATE KEY");
      }
    } else if (key.startsWith("npub")) {
      const hexKey = bech32ToHex(key);
      LoginStore.loginWithPubkey(hexKey, LoginSessionType.PublicKey);
    } else if (key.match(EmailRegex)) {
      const hexKey = await getNip05PubKey(key);
      LoginStore.loginWithPubkey(hexKey, LoginSessionType.PublicKey);
    } else if (key.match(MnemonicRegex)?.length === 24) {
      if (!hasSubtleCrypto) {
        throw new Error(insecureMsg);
      }
      const ent = generateBip39Entropy(key);
      const keyHex = entropyToPrivateKey(ent);
      LoginStore.loginWithPrivateKey(keyHex);
    } else if (key.length === 64) {
      if (!hasSubtleCrypto) {
        throw new Error(insecureMsg);
      }
      LoginStore.loginWithPrivateKey(key);
    } else if (key.startsWith("bunker://")) {
      const nip46 = new Nip46Signer(key);
      await nip46.init();

      const loginPubkey = await nip46.getPubKey();
      LoginStore.loginWithPubkey(loginPubkey, LoginSessionType.Nip46, undefined, nip46.relays, nip46.privateKey);
      nip46.close();
    } else {
      throw new Error("INVALID PRIVATE KEY");
    }
  }

  return {
    doLogin,
  };
}
