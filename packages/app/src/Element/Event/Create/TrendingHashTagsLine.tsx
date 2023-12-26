import { useLocale } from "@/IntlProvider";
import NostrBandApi from "@/External/NostrBand";
import { FormattedMessage } from "react-intl";
import useCachedFetch from "@/Hooks/useCachedFetch";

export function TrendingHashTagsLine(props: { onClick: (tag: string) => void }) {
  const { lang } = useLocale();
  const api = new NostrBandApi();
  const trendingHashtagsUrl = api.trendingHashtagsUrl(lang);
  const storageKey = `nostr-band-${trendingHashtagsUrl}`;

  const { data: hashtags, isLoading, error } = useCachedFetch(trendingHashtagsUrl, storageKey, data => data.hashtags);

  if (isLoading || error || !hashtags || hashtags.length === 0) return null;

  return (
    <div className="flex flex-col g4">
      <small>
        <FormattedMessage defaultMessage="Popular Hashtags" id="ddd3JX" />
      </small>
      <div className="flex g4 flex-wrap">
        {hashtags.slice(0, 5).map(a => (
          <span
            key={a.hashtag}
            className="px-2 py-1 bg-dark rounded-full pointer nowrap"
            onClick={() => props.onClick(a.hashtag)}>
            #{a.hashtag}
          </span>
        ))}
      </div>
    </div>
  );
}
