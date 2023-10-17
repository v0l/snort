import { useNavigate } from "react-router-dom";
import { FormattedMessage } from "react-intl";

export default function AccountName({ name = "", link = true }) {
  const navigate = useNavigate();
  return (
    <>
      <div>
        <FormattedMessage defaultMessage="Username" />: <b>{name}</b>
      </div>
      <div>
        <FormattedMessage defaultMessage="Short link" />:{" "}
        {link ? (
          <a
            href={`https://iris.to/${name}`}
            onClick={e => {
              e.preventDefault();
              navigate(`/${name}`);
            }}>
            iris.to/{name}
          </a>
        ) : (
          <>iris.to/{name}</>
        )}
      </div>
      <div>
        <FormattedMessage defaultMessage="Nostr address (nip05)" />: <b>{name}@iris.to</b>
      </div>
    </>
  );
}
