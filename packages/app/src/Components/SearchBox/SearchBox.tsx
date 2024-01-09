import "./SearchBox.css";

import { unixNow } from "@snort/shared";
import { NostrLink, tryParseNostrLink } from "@snort/system";
import { socialGraphInstance } from "@snort/system";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useLocation, useNavigate } from "react-router-dom";

import Icon from "@/Components/Icons/Icon";
import Spinner from "@/Components/Icons/Spinner";
import ProfileImage from "@/Components/User/ProfileImage";
import fuzzySearch, { FuzzySearchResult } from "@/Db/FuzzySearch";
import { fetchNip05Pubkey } from "@/Utils/Nip05/Verifier";

import useTimelineFeed, { TimelineFeedOptions, TimelineSubject } from "../../Feed/TimelineFeed";

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

  const options: TimelineFeedOptions = {
    method: "LIMIT_UNTIL",
    window: undefined,
    now: unixNow(),
  };

  const subject: TimelineSubject = {
    type: "profile_keyword",
    discriminator: search,
    items: search ? [search] : [],
    relay: undefined,
    streams: false,
  };

  const { main } = useTimelineFeed(subject, options);

  const [results, setResults] = useState<FuzzySearchResult[]>([]);
  useEffect(() => {
    const searchString = search.trim();
    const fuseResults = fuzzySearch.search(searchString);

    const followDistanceNormalizationFactor = 3;

    const combinedResults = fuseResults.map(result => {
      const fuseScore = result.score === undefined ? 1 : result.score;
      const followDistance =
        socialGraphInstance.getFollowDistance(result.item.pubkey) / followDistanceNormalizationFactor;

      const startsWithSearchString = [result.item.name, result.item.display_name, result.item.nip05].some(
        field => field && field.toLowerCase?.().startsWith(searchString.toLowerCase()),
      );

      const boostFactor = startsWithSearchString ? 0.25 : 1;

      const weightForFuseScore = 0.8;
      const weightForFollowDistance = 0.2;

      const combinedScore = (fuseScore * weightForFuseScore + followDistance * weightForFollowDistance) * boostFactor;

      return { ...result, combinedScore };
    });

    // Sort by combined score, lower is better
    combinedResults.sort((a, b) => a.combinedScore - b.combinedScore);

    setResults(combinedResults.map(r => r.item));
  }, [search, main]);

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
    <div className="search relative">
      <input
        ref={inputRef}
        type="text"
        placeholder={formatMessage({ defaultMessage: "Search", id: "xmcVZ0" })}
        className="w-max"
        value={search}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 150)}
      />
      {searching ? (
        <Spinner width={24} height={24} />
      ) : (
        <Icon className="text-secondary" name="search-outline" size={24} onClick={() => navigate("/search")} />
      )}
      {search && !searching && isFocused && (
        <div
          className="absolute top-full mt-2 w-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-black shadow-lg rounded-lg z-10 overflow-hidden"
          ref={resultListRef}>
          <div
            className={`p-2 cursor-pointer ${
              activeIndex === 0 ? "bg-bg-secondary" : "bg-bg-color hover:bg-bg-secondary"
            }`}
            onMouseEnter={() => setActiveIndex(0)}
            onClick={() => navigate(`/search/${encodeURIComponent(search)}`, { state: { forceRefresh: true } })}>
            <FormattedMessage defaultMessage="Search notes" id="EJbFi7" />: <b>{search}</b>
          </div>
          {results?.slice(0, MAX_RESULTS).map((result, idx) => (
            <div
              key={idx}
              className={`p-2 cursor-pointer ${
                activeIndex === idx + 1 ? "bg-bg-secondary" : "bg-bg-color hover:bg-bg-secondary"
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
