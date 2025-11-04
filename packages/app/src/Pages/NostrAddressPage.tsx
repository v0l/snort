import { FormattedMessage } from "react-intl";

import Nip5Service from "@/Components/Nip5Service";
import { SnortNostrAddressService } from "@/Pages/settings/SnortNostrAddressService";

const Nip5Services = [SnortNostrAddressService];

export default function NostrAddressPage() {
  return (
    <div className="px-3 py-2 flex flex-col gap-4">
      <h2>
        <FormattedMessage defaultMessage="Buy nostr address" />
      </h2>
      <p>
        <FormattedMessage
          defaultMessage="Nostr address' use the <a>NIP-05</a> specification which is a DNS based verification spec which helps to validate you as a real user."
          values={{
            a: c => (
              <a href="https://nostr-nips.com/nip-05" target="_blank" className="!underline">
                {c}
              </a>
            ),
          }}
        />
      </p>

      {Nip5Services.map(a => (
        <Nip5Service key={a.name} {...a} />
      ))}
    </div>
  );
}
