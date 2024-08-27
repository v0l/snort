import { encodeTLVEntries, NostrPrefix, TLVEntryType } from "@snort/system";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

import { bech32ToHex } from "@/Utils";
import { KieranPubKey } from "@/Utils/Const";

export default function HelpPage() {
  return (
    <>
      <h2>
        <FormattedMessage defaultMessage="NIP-05" />
      </h2>
      <p>
        <FormattedMessage
          defaultMessage="If you have an enquiry about your NIP-05 order please DM {link}"
          id="c35bj2"
          values={{
            link: (
              <Link
                to={`/messages/${encodeTLVEntries(NostrPrefix.Chat17, {
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
