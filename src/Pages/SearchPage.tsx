import { useIntl, FormattedMessage } from "react-intl";
import { useParams } from "react-router-dom";
import Timeline from "Element/Timeline";
import { useEffect, useState } from "react";
import { debounce } from "Util";
import { router } from "index";
import { SearchRelays } from "Const";
import { System } from "Nostr/System";

import messages from "./messages";

const SearchPage = () => {
  const params = useParams();
  const { formatMessage } = useIntl();
  const [search, setSearch] = useState<string>();
  const [keyword, setKeyword] = useState<string | undefined>(params.keyword);

  useEffect(() => {
    if (keyword) {
      // "navigate" changing only url
      router.navigate(`/search/${encodeURIComponent(keyword)}`);
    }
  }, [keyword]);

  useEffect(() => {
    return debounce(500, () => setKeyword(search));
  }, [search]);

  useEffect(() => {
    const addedRelays: string[] = [];
    for (const [k, v] of SearchRelays) {
      if (!System.Sockets.has(k)) {
        System.ConnectToRelay(k, v);
        addedRelays.push(k);
      }
    }
    return () => {
      for (const r of addedRelays) {
        System.DisconnectRelay(r);
      }
    };
  }, []);

  return (
    <div className="main-content">
      <h2>
        <FormattedMessage {...messages.Search} />
      </h2>
      <div className="flex mb10">
        <input
          type="text"
          className="f-grow mr10"
          placeholder={formatMessage(messages.SearchPlaceholder)}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      {keyword && (
        <Timeline
          key={keyword}
          subject={{
            type: "keyword",
            items: [keyword],
            discriminator: keyword,
          }}
          postsOnly={false}
          method={"TIME_RANGE"}
        />
      )}
    </div>
  );
};

export default SearchPage;
