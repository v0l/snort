import { useEffect, useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate, useParams } from "react-router-dom";

import { LocalSearch } from "@/Components/Feed/LocalSearch";
import TabSelectors, { Tab } from "@/Components/TabSelectors/TabSelectors";
import TrendingNotes from "@/Components/Trending/TrendingPosts";
import TrendingUsers from "@/Components/Trending/TrendingUsers";
import FollowListBase from "@/Components/User/FollowListBase";
import useProfileSearch from "@/Hooks/useProfileSearch";
import { debounce } from "@/Utils";

const NOTES = 0;
const PROFILES = 1;

const Profiles = ({ keyword }: { keyword: string }) => {
  const results = useProfileSearch(keyword);
  const ids = useMemo(() => results.map(r => r.pubkey), [results]);
  const content = keyword ? <FollowListBase pubkeys={ids} showAbout={true} /> : <TrendingUsers />;
  return <div className="px-3">{content}</div>;
};

const SearchPage = () => {
  const params = useParams();
  const { formatMessage } = useIntl();
  const [search, setSearch] = useState<string>(params.keyword ?? "");
  const [keyword, setKeyword] = useState<string>(params.keyword ?? "");
  const [sortPopular, setSortPopular] = useState<boolean>(true);
  // tabs
  const SearchTab = [
    { text: formatMessage({ defaultMessage: "Notes", id: "7+Domh" }), value: NOTES },
    { text: formatMessage({ defaultMessage: "People", id: "Tpy00S" }), value: PROFILES },
  ];
  const [tab, setTab] = useState<Tab>(SearchTab[0]);
  const navigate = useNavigate();

  useEffect(() => {
    if (keyword === params.keyword) return;
    if (keyword) {
      // "navigate" changing only url
      navigate(`/search/${encodeURIComponent(keyword)}`);
    } else {
      navigate(`/search`);
    }
  }, [keyword]);

  useEffect(() => {
    setKeyword(params.keyword ?? "");
    setSearch(params.keyword ?? ""); // Also update the search input field
  }, [params.keyword]);

  useEffect(() => {
    return debounce(500, () => setKeyword(search));
  }, [search]);

  function tabContent() {
    if (tab.value === PROFILES) {
      return <Profiles keyword={keyword} />
    }

    if (!keyword) {
      return <TrendingNotes />;
    }

    return (
      <>
        {sortOptions()}
        <LocalSearch term={keyword} kind={1} />
      </>
    );
  }

  function sortOptions() {
    if (tab.value != PROFILES) return null;
    return (
      <div className="flex items-center justify-end g8">
        <FormattedMessage defaultMessage="Sort" id="RwFaYs" description="Label for sorting options for people search" />
        <select onChange={e => setSortPopular(e.target.value == "true")} value={sortPopular ? "true" : "false"}>
          <option value={"true"}>
            <FormattedMessage defaultMessage="Popular" id="mTJFgF" description="Sort order name" />
          </option>
          <option value={"false"}>
            <FormattedMessage defaultMessage="Recent" id="RjpoYG" description="Sort order name" />
          </option>
        </select>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="p flex flex-col g8">
        <input
          type="text"
          className="w-max"
          placeholder={formatMessage({ defaultMessage: "Search...", id: "0BUTMv" })}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <TabSelectors tabs={SearchTab} tab={tab} setTab={setTab} />
      </div>
      {tabContent()}
    </div>
  );
};

export default SearchPage;
