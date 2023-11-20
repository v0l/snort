import { useIntl, FormattedMessage } from "react-intl";
import { useParams } from "react-router-dom";
import Timeline from "@/Element/Feed/Timeline";
import Tabs, { Tab } from "@/Element/Tabs";
import { useEffect, useState } from "react";
import { debounce } from "@/SnortUtils";
import { router } from "@/index";
import TrendingUsers from "@/Element/TrendingUsers";

import TrendingNotes from "@/Element/TrendingPosts";

const NOTES = 0;
const PROFILES = 1;

const SearchPage = () => {
  const params = useParams();
  const { formatMessage } = useIntl();
  const [search, setSearch] = useState<string | undefined>(params.keyword);
  const [keyword, setKeyword] = useState<string | undefined>(params.keyword);
  const [sortPopular, setSortPopular] = useState<boolean>(true);
  // tabs
  const SearchTab = [
    { text: formatMessage({ defaultMessage: "Notes", id: "7+Domh" }), value: NOTES },
    { text: formatMessage({ defaultMessage: "People", id: "Tpy00S" }), value: PROFILES },
  ];
  const [tab, setTab] = useState<Tab>(SearchTab[0]);

  useEffect(() => {
    if (keyword) {
      // "navigate" changing only url
      router.navigate(`/search/${encodeURIComponent(keyword)}`);
    } else {
      router.navigate(`/search`);
    }
  }, [keyword]);

  useEffect(() => {
    return debounce(500, () => setKeyword(search));
  }, [search]);

  function tabContent() {
    if (!keyword) {
      switch (tab.value) {
        case PROFILES:
          return <TrendingUsers />;
        case NOTES:
          return <TrendingNotes />;
      }
      return null;
    }

    const pf = tab.value == PROFILES;
    return (
      <>
        {sortOptions()}
        <Timeline
          key={keyword + (pf ? "_p" : "")}
          subject={{
            type: pf ? "profile_keyword" : "post_keyword",
            items: [keyword + (sortPopular ? " sort:popular" : "")],
            discriminator: keyword,
          }}
          postsOnly={false}
          noSort={pf && sortPopular}
          method={"LIMIT_UNTIL"}
          loadMore={false}
        />
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
        <h2>
          <FormattedMessage defaultMessage="Search" id="xmcVZ0" />
        </h2>
        <input
          type="text"
          className="w-max"
          placeholder={formatMessage({ defaultMessage: "Search...", id: "0BUTMv" })}
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus={true}
        />
        <Tabs tabs={SearchTab} tab={tab} setTab={setTab} />
      </div>
      {tabContent()}
    </div>
  );
};

export default SearchPage;
