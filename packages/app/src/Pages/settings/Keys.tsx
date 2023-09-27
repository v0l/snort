import "./Keys.css";
import FormattedMessage from "Element/FormattedMessage";
import { encodeTLV, NostrPrefix, PinEncrypted } from "@snort/system";

import Copy from "Element/Copy";
import useLogin from "Hooks/useLogin";
import { hexToMnemonic } from "nip6";
import { hexToBech32 } from "SnortUtils";

export default function ExportKeys() {
  const { publicKey, privateKeyData, generatedEntropy } = useLogin();
  return (
    <div className="flex-column g12">
      <h3>
        <FormattedMessage defaultMessage="Public Key" />
      </h3>
      <Copy text={hexToBech32("npub", publicKey ?? "")} className="dashed" />
      <Copy text={encodeTLV(NostrPrefix.Profile, publicKey ?? "")} className="dashed" />
      {privateKeyData instanceof PinEncrypted && (
        <>
          <h3>
            <FormattedMessage defaultMessage="Private Key" />
          </h3>
          <Copy text={hexToBech32("nsec", privateKeyData.value)} className="dashed" />
        </>
      )}
      {generatedEntropy && (
        <>
          <h3>
            <FormattedMessage defaultMessage="Mnemonic" />
          </h3>
          <Copy text={hexToMnemonic(generatedEntropy ?? "")} className="dashed" />
        </>
      )}
    </div>
  );
}
