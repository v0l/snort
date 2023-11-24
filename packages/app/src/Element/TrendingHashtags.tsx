import { ReactNode, useEffect, useState } from "react";

import PageSpinner from "@/Element/PageSpinner";
import NostrBandApi from "@/External/NostrBand";
import { ErrorOrOffline } from "./ErrorOrOffline";
import { HashTagHeader } from "@/Pages/HashTagsPage";
import { useLocale } from "@/IntlProvider";
import classNames from "classnames";
import {Link} from "react-router-dom";

export default function TrendingHashtags({ title, count = Infinity, short }: { title?: ReactNode; count?: number, short?: boolean }) {
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
      {hashtags.map(a => {
        if (short) {
          // return just the hashtag (not HashTagHeader) and post count
          return (
            <div className="my-1 font-bold" key={a.hashtag}>
              <Link to={`/t/${a.hashtag}`} key={a.hashtag}>
                #{a.hashtag}
              </Link>
            </div>
          );
        } else {
          return (
            <HashTagHeader tag={a.hashtag} events={a.posts} className={classNames("bb", { p: !short })} />
          );
        }
      })}
    </>
  );
}
