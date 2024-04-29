import { FormattedMessage } from "react-intl";

import IrisAccount from "@/Components/IrisAccount/IrisAccount";

import messages from "./messages";

export default function FreeNostrAddressPage() {
  return (
    <div className="main-content p">
      <h2>
        <FormattedMessage defaultMessage="Get a free nostr address" />
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

      <IrisAccount />
    </div>
  );
}
