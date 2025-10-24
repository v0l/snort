import "./Keys.css";

import { KeyStorage } from "@snort/system";
import { FormattedMessage } from "react-intl";

import Copy from "@/Components/Copy/Copy";
import useLogin from "@/Hooks/useLogin";
import { seedToMnemonic } from "@/Utils/nip6";
import { encodeTLV, hexToBech32, NostrPrefix } from "@snort/shared";

export default function ExportKeys() {
  const { publicKey, privateKeyData, generatedEntropy } = useLogin();
  const copyClass = "p-3 rounded-lg border border-dashed";
  return (
    <div className="flex flex-col gap-3">
      <div className="text-xl">
        <FormattedMessage defaultMessage="Public Key" />
      </div>
      <small>
        <FormattedMessage
          defaultMessage="The public key is like your username, you can share it with anyone."
          id="dK2CcV"
        />
      </small>
      <Copy text={hexToBech32("npub", publicKey ?? "")} className={copyClass} />
      <Copy text={encodeTLV(NostrPrefix.Profile, publicKey ?? "")} className={copyClass} />
      {privateKeyData instanceof KeyStorage && (
        <>
          <div className="text-xl">
            <FormattedMessage defaultMessage="Private Key" />
          </div>
          <small>
            <FormattedMessage
              defaultMessage="The private key is like a password, but it cannot be reset. Guard it carefully and never show it to anyone. Once someone has your private key, they will have access to your account forever."
              id="QJfhKt"
            />
          </small>
          <Copy text={hexToBech32("nsec", privateKeyData.value)} className={copyClass} mask="*" />
        </>
      )}
      {generatedEntropy && (
        <>
          <div className="text-xl">
            <FormattedMessage defaultMessage="Mnemonic" />
          </div>
          <div className="mnemonic-grid">
            {seedToMnemonic(generatedEntropy ?? "")
              .split(" ")
              .map((a, i) => (
                <div key={a} className="flex items-center word">
                  <div>{i + 1}</div>
                  <div>{a}</div>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
