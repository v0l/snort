import { useIntl } from "react-intl";
import { Nip46Signer, PinEncrypted } from "@snort/system";

import { EmailRegex, MnemonicRegex } from "Const";
import { LoginSessionType, LoginStore } from "Login";
import { generateBip39Entropy, entropyToPrivateKey } from "nip6";
import { getNip05PubKey } from "Pages/LoginPage";
import { bech32ToHex } from "SnortUtils";

export class PinRequiredError extends Error { }

export default function useLoginHandler() {
  const { formatMessage } = useIntl();
  const hasSubtleCrypto = window.crypto.subtle !== undefined;

  async function doLogin(key: string, pin?: string) {
    const insecureMsg = formatMessage({
      defaultMessage:
        "Can't login with private key on an insecure connection, please use a Nostr key manager extension instead",
    });
    // private key logins
    if (key.startsWith("nsec")) {
      if (!hasSubtleCrypto) {
        throw new Error(insecureMsg);
      }
      const hexKey = bech32ToHex(key);
      if (hexKey.length === 64) {
        if (!pin) throw new PinRequiredError();
        LoginStore.loginWithPrivateKey(PinEncrypted.create(hexKey, pin));
      } else {
        throw new Error("INVALID PRIVATE KEY");
      }
    } else if (key.match(MnemonicRegex)?.length === 24) {
      if (!hasSubtleCrypto) {
        throw new Error(insecureMsg);
      }
      if (!pin) throw new PinRequiredError();
      const ent = generateBip39Entropy(key);
      const keyHex = entropyToPrivateKey(ent);
      LoginStore.loginWithPrivateKey(PinEncrypted.create(keyHex, pin));
    } else if (key.length === 64) {
      if (!hasSubtleCrypto) {
        throw new Error(insecureMsg);
      }
      if (!pin) throw new PinRequiredError();
      LoginStore.loginWithPrivateKey(PinEncrypted.create(key, pin));
    }

    // public key logins
    if (key.startsWith("npub")) {
      const hexKey = bech32ToHex(key);
      LoginStore.loginWithPubkey(hexKey, LoginSessionType.PublicKey);
    } else if (key.match(EmailRegex)) {
      const hexKey = await getNip05PubKey(key);
      LoginStore.loginWithPubkey(hexKey, LoginSessionType.PublicKey);
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
