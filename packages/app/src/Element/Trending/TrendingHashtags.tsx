import { ReactNode } from "react";
import NostrBandApi from "@/External/NostrBand";
import { ErrorOrOffline } from "../ErrorOrOffline";
import { HashTagHeader } from "@/Pages/HashTagsPage";
import { useLocale } from "@/IntlProvider";
import classNames from "classnames";
import { Link } from "react-router-dom";
import useCachedFetch from "@/Hooks/useCachedFetch";
import PageSpinner from "@/Element/PageSpinner";

export default function TrendingHashtags({
  title,
  count = Infinity,
  short,
}: {
  title?: ReactNode;
  count?: number;
  short?: boolean;
}) {
  const { lang } = useLocale();
  const api = new NostrBandApi();
  const trendingHashtagsUrl = api.trendingHashtagsUrl(lang);
  const storageKey = `nostr-band-${trendingHashtagsUrl}`;

  const {
    data: hashtags,
    error,
    isLoading,
  } = useCachedFetch(trendingHashtagsUrl, storageKey, data => data.hashtags.slice(0, count));

  if (error) return <ErrorOrOffline error={error} onRetry={() => {}} className="p" />;
  if (isLoading) return <PageSpinner />;

  return (
    <>
      {title}
      {hashtags.map(a => {
        if (short) {
          return (
            <div className="my-1 font-bold" key={a.hashtag}>
              <Link to={`/t/${a.hashtag}`}>#{a.hashtag}</Link>
            </div>
          );
        } else {
          return <HashTagHeader tag={a.hashtag} events={a.posts} className={classNames("bb", { p: !short })} />;
        }
      })}
    </>
  );
}
