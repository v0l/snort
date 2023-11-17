import "./Keys.css";
import { FormattedMessage } from "react-intl";
import { encodeTLV, KeyStorage, NostrPrefix } from "@snort/system";

import Copy from "@/Element/Copy";
import useLogin from "@/Hooks/useLogin";
import { hexToMnemonic } from "@/nip6";
import { hexToBech32 } from "@/SnortUtils";

export default function ExportKeys() {
  const { publicKey, privateKeyData, generatedEntropy } = useLogin();
  return (
    <div className="flex flex-col g12">
      <h2>
        <FormattedMessage defaultMessage="Public Key" />
      </h2>
      <Copy text={hexToBech32("npub", publicKey ?? "")} className="dashed" />
      <Copy text={encodeTLV(NostrPrefix.Profile, publicKey ?? "")} className="dashed" />
      {privateKeyData instanceof KeyStorage && (
        <>
          <h2>
            <FormattedMessage defaultMessage="Private Key" />
          </h2>
          <Copy text={hexToBech32("nsec", privateKeyData.value)} className="dashed" />
        </>
      )}
      {generatedEntropy && (
        <>
          <h2>
            <FormattedMessage defaultMessage="Mnemonic" />
          </h2>
          <div className="mnemonic-grid">
            {hexToMnemonic(generatedEntropy ?? "")
              .split(" ")
              .map((a, i) => (
                <div className="flex items-center word">
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
