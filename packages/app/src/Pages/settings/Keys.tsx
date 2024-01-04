import "./Keys.css";

import { encodeTLV, KeyStorage, NostrPrefix } from "@snort/system";
import { FormattedMessage } from "react-intl";

import Copy from "@/Components/Copy/Copy";
import useLogin from "@/Hooks/useLogin";
import { hexToBech32 } from "@/Utils";
import { hexToMnemonic } from "@/Utils/nip6";

export default function ExportKeys() {
  const { publicKey, privateKeyData, generatedEntropy } = useLogin();
  return (
    <div className="flex flex-col g12">
      <h2>
        <FormattedMessage defaultMessage="Public Key" id="bep9C3" />
      </h2>
      <Copy text={hexToBech32("npub", publicKey ?? "")} className="dashed" />
      <Copy text={encodeTLV(NostrPrefix.Profile, publicKey ?? "")} className="dashed" />
      {privateKeyData instanceof KeyStorage && (
        <>
          <h2>
            <FormattedMessage defaultMessage="Private Key" id="JymXbw" />
          </h2>
          <Copy text={hexToBech32("nsec", privateKeyData.value)} className="dashed" />
        </>
      )}
      {generatedEntropy && (
        <>
          <h2>
            <FormattedMessage defaultMessage="Mnemonic" id="b12Goz" />
          </h2>
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
