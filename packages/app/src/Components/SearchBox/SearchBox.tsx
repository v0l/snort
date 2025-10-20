import { NostrLink, tryParseNostrLink } from "@snort/system";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useLocation, useNavigate } from "react-router-dom";

import Icon from "@/Components/Icons/Icon";
import Spinner from "@/Components/Icons/Spinner";
import ProfileImage from "@/Components/User/ProfileImage";
import useProfileSearch from "@/Hooks/useProfileSearch";
import { fetchNip05Pubkey } from "@snort/shared";

const MAX_RESULTS = 3;

export default function SearchBox() {
  const { formatMessage } = useIntl();
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const resultListRef = useRef<HTMLDivElement | null>(null);

  const searchFn = useProfileSearch();
  const results = useMemo(() => searchFn(search), [search, searchFn]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearch("");
      }
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
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
    const val = e.target.value;
    if (val.match(/nsec1[a-zA-Z0-9]{20,65}/gi)) {
      e.preventDefault();
    } else if (val.trim().match(/^(npub|note|nevent|nprofile)1[a-zA-Z0-9]{20,200}$/gi)) {
      navigate(`/${val.trim()}`);
      e.preventDefault();
    } else {
      setSearch(val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "Enter":
        if (activeIndex === 0) {
          navigate(`/search/${encodeURIComponent(search)}`);
        } else if (activeIndex > 0 && results) {
          const selectedResult = results[activeIndex - 1];
          navigate(`/${new NostrLink(CONFIG.profileLinkPrefix, selectedResult.pubkey).encode()}`);
          inputRef.current?.blur();
        } else {
          executeSearch();
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex(prev => Math.min(prev + 1, Math.min(MAX_RESULTS, results ? results.length : 0)));
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
    <div className="flex-grow flex bg-neutral-900 rounded-full relative md:p-0 md:bg-transparent">
      <input
        ref={inputRef}
        type="text"
        placeholder={formatMessage({ defaultMessage: "Search", id: "xmcVZ0" })}
        className="w-stretch !border-none !rounded-none text-[15px] leading-[21px] py-2.5 px-4 md:hidden"
        value={search}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 150)}
      />
      {searching ? (
        <Spinner width={24} height={24} className="my-2.5 mx-4" />
      ) : (
        <Icon
          className="text-neutral-400 my-2.5 mx-4"
          name="search-outline"
          size={24}
          onClick={() => navigate("/search")}
        />
      )}
      {search && !searching && isFocused && (
        <div
          className="absolute top-full mt-2 w-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-black shadow-lg rounded-lg z-10 overflow-hidden"
          ref={resultListRef}>
          <div
            className={`p-2 cursor-pointer ${activeIndex === 0 ? "bg-secondary" : "bg-background hover:bg-secondary"}`}
            onMouseEnter={() => setActiveIndex(0)}
            onClick={() => navigate(`/search/${encodeURIComponent(search)}`, { state: { forceRefresh: true } })}>
            <FormattedMessage defaultMessage="Search notes" />: <b>{search}</b>
          </div>
          {results?.slice(0, MAX_RESULTS).map((result, idx) => (
            <div
              key={idx}
              className={`p-2 cursor-pointer ${
                activeIndex === idx + 1 ? "bg-secondary" : "bg-background hover:bg-secondary"
              }`}
              onMouseEnter={() => setActiveIndex(idx + 1)}>
              <ProfileImage pubkey={result.pubkey} showProfileCard={false} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
