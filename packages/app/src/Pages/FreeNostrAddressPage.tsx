import { FormattedMessage } from "react-intl";
import messages from "./messages";

export default function FreeNostrAddressPage() {
  return (
    <div className="px-3 py-2">
      <h2>
        <FormattedMessage defaultMessage="Get a free nostr address" />
      </h2>
      <p>
        <FormattedMessage {...messages.Nip05} />
      </p>
      <p>
        <FormattedMessage {...messages.Nip05Pros} />
      </p>
      <ul className="list-disc">
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
    </div>
  );
}
