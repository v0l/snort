import { useNavigate } from "react-router-dom";

export default function AccountName({ name = "", link = true }) {
  const navigate = useNavigate();
  return (
    <>
      <div>
        Username: <b>{name}</b>
      </div>
      <div>
        Short link:{" "}
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
        Nostr address (nip05): <b>{name}@iris.to</b>
      </div>
    </>
  );
}
