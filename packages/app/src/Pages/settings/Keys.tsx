import "./Keys.css";

import { encodeTLV, KeyStorage, NostrPrefix } from "@snort/system";
import { FormattedMessage } from "react-intl";

import Copy from "@/Components/Copy/Copy";
import useLogin from "@/Hooks/useLogin";
import { hexToBech32 } from "@/Utils";
import { hexToMnemonic } from "@/Utils/nip6";

export default function ExportKeys() {
  const { publicKey, privateKeyData, generatedEntropy } = useLogin();
  const copyClass = "p-3 br border border-dashed border-[var(--gray-medium)]";
  return (
    <div className="flex flex-col g12">
      <div className="text-xl">
        <FormattedMessage defaultMessage="Public Key" id="bep9C3" />
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
            <FormattedMessage defaultMessage="Private Key" id="JymXbw" />
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
            <FormattedMessage defaultMessage="Mnemonic" id="b12Goz" />
          </div>
          <div className="mnemonic-grid">
            {hexToMnemonic(generatedEntropy ?? "")
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
