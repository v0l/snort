import { FormattedMessage } from "react-intl";

import Nip5Service from "@/Components/Nip5Service";
import { SnortNostrAddressService } from "@/Pages/settings/SnortNostrAddressService";

import messages from "./messages";

const Nip5Services = [SnortNostrAddressService];

export default function NostrAddressPage() {
  return (
    <div className="main-content p">
      <h2>
        <FormattedMessage defaultMessage="Buy nostr address" />
      </h2>
      <p>
        <FormattedMessage {...messages.Nip05} />
      </p>
      <p>
        <FormattedMessage {...messages.Nip05Pros} />
      </p>
      <ul>
        <li>
          <FormattedMessage {...messages.AvoidImpersonators} />
        </li>
        <li>
          <FormattedMessage {...messages.EasierToFind} />
        </li>
        <li>
          <FormattedMessage {...messages.Funding} />
        </li>
      </ul>

      {Nip5Services.map(a => (
        <Nip5Service key={a.name} {...a} />
      ))}
    </div>
  );
}
