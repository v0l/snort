import { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useNavigate, useParams } from "react-router-dom";

import Timeline from "@/Components/Feed/Timeline";
import TabSelectors, { Tab } from "@/Components/TabSelectors/TabSelectors";
import TrendingNotes from "@/Components/Trending/TrendingPosts";
import TrendingUsers from "@/Components/Trending/TrendingUsers";
import FollowListBase from "@/Components/User/FollowListBase";
import { TimelineSubject } from "@/Feed/TimelineFeed";
import useProfileSearch from "@/Hooks/useProfileSearch";
import { debounce } from "@/Utils";

const NOTES = 0;
const PROFILES = 1;

const Profiles = ({ keyword }: { keyword: string }) => {
  const searchFn = useProfileSearch();
  const results = useMemo(() => searchFn(keyword), [keyword, searchFn]);
  const ids = useMemo(() => results.map(r => r.pubkey), [results]);
  const content = keyword ? (
    <FollowListBase
      pubkeys={ids}
      profilePreviewProps={{
        options: { about: true },
      }}
    />
  ) : (
    <TrendingUsers />
  );
  return <div className="px-3">{content}</div>;
};

const SearchPage = () => {
  const params = useParams();
  const { formatMessage } = useIntl();
  const [search, setSearch] = useState<string>(params.keyword ?? "");
  // tabs
  const SearchTab = [
    { text: formatMessage({ defaultMessage: "Notes" }), value: NOTES },
    { text: formatMessage({ defaultMessage: "People" }), value: PROFILES },
  ];
  const [tab, setTab] = useState<Tab>(SearchTab[0]);
  const navigate = useNavigate();

  const subject = useMemo(() => {
    return {
      type: "post_keyword",
      items: [search],
      discriminator: search,
    } as TimelineSubject;
  }, [params.keyword]);

  const content = useMemo(() => {
    if (tab.value === PROFILES) {
      return <Profiles keyword={params.keyword ?? ""} />;
    }

    if (!params.keyword) {
      return <TrendingNotes />;
    }

    return <Timeline key={params.keyword} subject={subject} postsOnly={false} method={"LIMIT_UNTIL"} />;
  }, [params.keyword, tab]);

  return (
    <div>
      <div className="px-3 py-2 flex flex-col gap-2">
        <input
          type="search"
          placeholder={formatMessage({ defaultMessage: "Search..." })}
          value={search}
          onChange={e => setSearch(e.target.value)}
          onSubmit={() => navigate(`/search/${encodeURIComponent(search)}`)}
          onKeyDown={k => {
            if (k.key === "Enter") {
              navigate(`/search/${encodeURIComponent(search)}`);
            }
          }}
        />
        <TabSelectors tabs={SearchTab} tab={tab} setTab={setTab} />
      </div>
      {content}
    </div>
  );
};

export default SearchPage;
