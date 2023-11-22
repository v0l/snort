import { ReactNode, useEffect, useState } from "react";

import PageSpinner from "@/Element/PageSpinner";
import NostrBandApi from "@/External/NostrBand";
import { ErrorOrOffline } from "./ErrorOrOffline";
import { HashTagHeader } from "@/Pages/HashTagsPage";
import { useLocale } from "@/IntlProvider";

export default function TrendingHashtags({ title, count = 5 }: { title?: ReactNode; count?: number }) {
  const [hashtags, setHashtags] = useState<Array<{ hashtag: string; posts: number }>>();
  const [error, setError] = useState<Error>();
  const { lang } = useLocale();

  async function loadTrendingHashtags() {
    const api = new NostrBandApi();
    const rsp = await api.trendingHashtags(lang);
    setHashtags(rsp.hashtags.slice(0, count)); // Limit the number of hashtags to the count
  }

  useEffect(() => {
    loadTrendingHashtags().catch(e => {
      if (e instanceof Error) {
        setError(e);
      }
    });
  }, []);

  if (error) return <ErrorOrOffline error={error} onRetry={loadTrendingHashtags} className="p" />;
  if (!hashtags) return <PageSpinner />;

  return (
    <>
      {title}
      {hashtags.map(a => (
        <HashTagHeader tag={a.hashtag} events={a.posts} className="bb p" />
      ))}
    </>
  );
}
