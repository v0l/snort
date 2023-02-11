import { Link } from "react-router-dom";
import { KieranPubKey } from "Const";
import { FormattedMessage } from "react-intl";

export default function HelpPage() {
  return (
    <>
      <h2>
        <FormattedMessage defaultMessage="NIP-05" />
      </h2>
      <p>
        <FormattedMessage
          defaultMessage="If you have an enquiry about your NIP-05 order please DM {link}"
          values={{
            link: <Link to={`/messages/${KieranPubKey}`}>Kieran</Link>,
          }}
        />
      </p>
    </>
  );
}
