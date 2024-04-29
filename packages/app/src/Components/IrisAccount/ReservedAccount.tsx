import { FormattedMessage } from "react-intl";

import AccountName from "./AccountName";

interface ReservedAccountProps {
  name?: string;
  enableReserved: () => void;
  declineReserved: () => void;
}

export default function ReservedAccount({
  name = "",
  enableReserved = () => {},
  declineReserved = () => {},
}: ReservedAccountProps) {
  return (
    <div>
      <p className="success">
        <FormattedMessage
          defaultMessage="Username iris.to/<b>{name}</b> is reserved for you!"
          id="Zff6lu"
          values={{ name, b: s => <b>{s}</b> }}
        />
      </p>
      <AccountName name={name} link={false} />
      <p>
        <button className="btn btn-sm btn-primary" onClick={() => enableReserved()}>
          <FormattedMessage defaultMessage="Yes please" />
        </button>
      </p>
      <p>
        <button className="btn btn-sm btn-neutral" onClick={() => declineReserved()}>
          <FormattedMessage defaultMessage="No thanks" />
        </button>
      </p>
    </div>
  );
}
