import { Link } from "react-router-dom";
import { KieranPubKey } from "@/Const";
import { FormattedMessage } from "react-intl";
import { TLVEntryType, encodeTLVEntries, NostrPrefix } from "@snort/system";
import { bech32ToHex } from "@/SnortUtils";

export default function HelpPage() {
  return (
    <>
      <h2>
        <FormattedMessage defaultMessage="NIP-05" id="7hp70g" />
      </h2>
      <p>
        <FormattedMessage
          defaultMessage="If you have an enquiry about your NIP-05 order please DM {link}" id="c35bj2"
          values={{
            link: (
              <Link
                to={`/messages/${encodeTLVEntries("chat4" as NostrPrefix, {
                  type: TLVEntryType.Author,
                  length: 64,
                  value: bech32ToHex(KieranPubKey),
                })}`}>
                Kieran
              </Link>
            ),
          }}
        />
      </p>
    </>
  );
}
