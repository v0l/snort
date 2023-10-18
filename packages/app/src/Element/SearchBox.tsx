import "./SearchBox.css";
import Spinner from "../Icons/Spinner";
import Icon from "../Icons/Icon";
import { FormattedMessage, useIntl } from "react-intl";
import { fetchNip05Pubkey } from "../Nip05/Verifier";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { NostrLink, tryParseNostrLink } from "@snort/system";
import { useLocation, useNavigate } from "react-router-dom";
import { unixNow } from "@snort/shared";
import useTimelineFeed, { TimelineFeedOptions, TimelineSubject } from "../Feed/TimelineFeed";
import Note from "./Event/Note";

const MAX_RESULTS = 3;

export default function SearchBox() {
  const { formatMessage } = useIntl();
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const resultListRef = useRef<HTMLDivElement | null>(null);

  const options: TimelineFeedOptions = {
    method: "LIMIT_UNTIL",
    window: undefined,
    now: unixNow(),
  };

  const subject: TimelineSubject = {
    type: "profile_keyword",
    discriminator: search,
    items: [search],
    relay: undefined,
    streams: false,
  };

  const { main } = useTimelineFeed(subject, options);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearch("");
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);

    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, []);

  useEffect(() => {
    // Close the search on navigation
    setSearch("");
    setActiveIndex(-1);
  }, [location]);

  const executeSearch = async () => {
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
          navigate(`/${new NostrLink(CONFIG.profileLinkPrefix, pk).encode()}`);
          return;
        }
      }
      navigate(`/search/${encodeURIComponent(search)}`);
    } finally {
      setSearching(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value.match(/nsec1[a-zA-Z0-9]{20,65}/gi)) {
      setSearch(e.target.value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "Enter":
        if (activeIndex === 0) {
          navigate(`/search/${encodeURIComponent(search)}`);
        } else if (activeIndex > 0 && main) {
          const selectedResult = main[activeIndex - 1];
          navigate(`/${new NostrLink(CONFIG.profileLinkPrefix, selectedResult.pubkey).encode()}`);
        } else {
          executeSearch();
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex(prev => Math.min(prev + 1, Math.min(MAX_RESULTS, main ? main.length : 0)));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex(prev => Math.max(prev - 1, 0));
        break;
      default:
        break;
    }
  };

  return (
    <div className="search relative">
      <input
        type="text"
        placeholder={formatMessage({ defaultMessage: "Search" })}
        className="w-max"
        value={search}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      {searching ? (
        <Spinner width={24} height={24} />
      ) : (
        <Icon name="search" size={24} onClick={() => navigate("/search")} />
      )}
      {search && !searching && (
        <div
          className="absolute top-full mt-2 w-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-black shadow-lg rounded-lg z-10 overflow-hidden"
          ref={resultListRef}>
          <div
            className={`p-2 cursor-pointer ${
              activeIndex === 0
                ? "bg-neutral-300 dark:bg-neutral-800 hover:bg-neutral-400 dark:hover:bg-neutral-600"
                : "hover:bg-neutral-200 dark:hover:bg-neutral-800"
            }`}
            onMouseEnter={() => setActiveIndex(0)}
            onClick={() => navigate(`/search/${encodeURIComponent(search)}`, { state: { forceRefresh: true } })}>
            <FormattedMessage defaultMessage="Search notes" />: <b>{search}</b>
          </div>
          {main?.slice(0, MAX_RESULTS).map((result, idx) => (
            <div
              key={idx}
              className={`p-2 cursor-pointer ${
                activeIndex === idx + 1
                  ? "bg-neutral-300 dark:bg-neutral-800 hover:bg-neutral-400 dark:hover:bg-neutral-600"
                  : "hover:bg-neutral-200 dark:hover:bg-neutral-800"
              }`}
              onMouseEnter={() => setActiveIndex(idx + 1)}>
              <Note data={result} depth={0} related={[]} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
