import { ReactNode } from "react";
import { Link } from "react-router-dom";

import { useLocale } from "@/Components/IntlProvider/useLocale";
import PageSpinner from "@/Components/PageSpinner";
import NostrBandApi from "@/External/NostrBand";
import { HashTagHeader } from "@/Pages/HashTagsPage";

import { ErrorOrOffline } from "../ErrorOrOffline";
import { useCached } from "@snort/system-react";
import { Hour } from "@/Utils/Const";

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
  const {
    data: hashtags,
    error,
    loading,
  } = useCached(
    "nostr-band-trending-hashtags",
    async () => {
      const api = new NostrBandApi();
      return await api.trendingHashtags(lang);
    },
    Hour * 2,
  );

  if (error && !hashtags) return <ErrorOrOffline error={error} onRetry={() => {}} className="px-3 py-2" />;
  if (loading && !hashtags) return <PageSpinner />;

  return (
    <>
      {title}
      {hashtags?.hashtags.slice(0, count).map(a => {
        if (short) {
          return (
            <div className="py-1 font-bold" key={a.hashtag}>
              <Link to={`/t/${a.hashtag}`}>#{a.hashtag}</Link>
            </div>
          );
        } else {
          return <HashTagHeader key={a.hashtag} tag={a.hashtag} events={a.posts} />;
        }
      })}
    </>
  );
}
