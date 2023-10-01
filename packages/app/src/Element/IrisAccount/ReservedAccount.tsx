import AccountName from "./AccountName";
import FormattedMessage from "Element/FormattedMessage";

export default function ReservedAccount({ name = "", enableReserved = () => {}, declineReserved = () => {} }) {
  return (
    <div>
      <p className="text-iris-green">
        <FormattedMessage
          defaultMessage="Username iris.to/<b>{name}</b> is reserved for you!"
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
