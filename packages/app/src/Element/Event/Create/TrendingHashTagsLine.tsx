import { useEffect, useState } from "react";
import { useLocale } from "@/IntlProvider";
import NostrBandApi from "@/External/NostrBand";
import { FormattedMessage } from "react-intl";

export function TrendingHashTagsLine(props: { onClick: (tag: string) => void }) {
  const [hashtags, setHashtags] = useState<Array<{ hashtag: string; posts: number }>>();
  const { lang } = useLocale();

  async function loadTrendingHashtags() {
    const api = new NostrBandApi();
    const rsp = await api.trendingHashtags(lang);
    setHashtags(rsp.hashtags);
  }

  useEffect(() => {
    loadTrendingHashtags().catch(console.error);
  }, []);

  if (!hashtags || hashtags.length === 0) return;
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
