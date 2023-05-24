import "./Keys.css";
import { FormattedMessage } from "react-intl";
import { encodeTLV, NostrPrefix } from "@snort/nostr";

import Copy from "Element/Copy";
import useLogin from "Hooks/useLogin";
import { hexToMnemonic } from "nip6";
import { hexToBech32 } from "SnortUtils";

export default function ExportKeys() {
  const { publicKey, privateKey, generatedEntropy } = useLogin();
  return (
    <div className="export-keys">
      <h3>
        <FormattedMessage defaultMessage="Public Key" />
      </h3>
      <Copy text={hexToBech32("npub", publicKey ?? "")} maxSize={48} className="mb10" />
      <Copy text={encodeTLV(NostrPrefix.Profile, publicKey ?? "")} maxSize={48} />
      {privateKey && (
        <>
          <h3>
            <FormattedMessage defaultMessage="Private Key" />
          </h3>
          <Copy text={hexToBech32("nsec", privateKey)} maxSize={48} />
        </>
      )}
      {generatedEntropy && (
        <>
          <h3>
            <FormattedMessage defaultMessage="Mnemonic" />
          </h3>
          <Copy text={hexToMnemonic(generatedEntropy ?? "")} maxSize={48} />
        </>
      )}
    </div>
  );
}
