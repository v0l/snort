import "./SearchBox.css";
import Spinner from "../Icons/Spinner";
import Icon from "../Icons/Icon";
import { useIntl } from "react-intl";
import { fetchNip05Pubkey } from "../Nip05/Verifier";
import { useState } from "react";
import { NostrLink, NostrPrefix, tryParseNostrLink } from "@snort/system";
import { useNavigate } from "react-router-dom";

export default function SearchBox() {
  const { formatMessage } = useIntl();
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();

  async function searchThing() {
    try {
      setSearching(true);
      const link = tryParseNostrLink(search);
      if (link) {
        navigate(`/${link.encode()}`);
        return;
      }
      if (search.includes("@")) {
        const [handle, domain] = search.split("@");
        const pk = await fetchNip05Pubkey(handle, domain);
        if (pk) {
          navigate(`/${new NostrLink(NostrPrefix.PublicKey, pk).encode()}`);
          return;
        }
      }
      navigate(`/search/${encodeURIComponent(search)}`);
    } finally {
      setSearch("");
      setSearching(false);
    }
  }

  return (
    <div className="search">
      <input
        type="text"
        placeholder={formatMessage({ defaultMessage: "Search" })}
        className="w-max"
        value={search}
        onChange={e => setSearch(e.target.value)}
        onKeyDown={async e => {
          if (e.key === "Enter") {
            await searchThing();
          }
        }}
      />
      {searching ? (
        <Spinner width={24} height={24} />
      ) : (
        <Icon name="search" size={24} onClick={() => navigate("/search")} />
      )}
    </div>
  );
}
