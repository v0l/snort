import { useIntl } from "react-intl";

import { EmailRegex, MnemonicRegex } from "Const";
import { LoginStore } from "Login";
import { generateBip39Entropy, entropyToPrivateKey } from "nip6";
import { getNip05PubKey } from "Pages/LoginPage";
import { bech32ToHex } from "Util";

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
      LoginStore.loginWithPubkey(hexKey);
    } else if (key.match(EmailRegex)) {
      const hexKey = await getNip05PubKey(key);
      LoginStore.loginWithPubkey(hexKey);
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
    } else {
      throw new Error("INVALID PRIVATE KEY");
    }
  }

  return {
    doLogin,
  };
}
