import { useEffect, useState } from "react";
import { NostrEvent, NostrLink, TaggedNostrEvent } from "@snort/system";
import { useReactions } from "@snort/system-react";

import PageSpinner from "@/Element/PageSpinner";
import Note from "@/Element/Event/Note";
import NostrBandApi from "@/External/NostrBand";
import { ErrorOrOffline } from "@/Element/ErrorOrOffline";
import { useLocale } from "@/IntlProvider";
import useModeration from "@/Hooks/useModeration";
import ShortNote from "@/Element/Trending/ShortNote";
import classNames from "classnames";
import { DisplayAs, DisplayAsSelector } from "@/Element/Feed/DisplayAsSelector";
import ImageGridItem from "@/Element/Feed/ImageGridItem";

export default function TrendingNotes({ count = Infinity, small = false }) {
  // Added count prop with a default value
  const [posts, setPosts] = useState<Array<NostrEvent>>();
  const [error, setError] = useState<Error>();
  const { lang } = useLocale();
  const { isEventMuted } = useModeration();
  const [displayAs, setDisplayAs] = useState<DisplayAs>("list");
  const related = useReactions("trending", posts?.map(a => NostrLink.fromEvent(a)) ?? [], undefined, true);

  async function loadTrendingNotes() {
    const api = new NostrBandApi();
    const trending = await api.trendingNotes(lang);
    setPosts(trending.notes.map(a => a.event));
  }

  useEffect(() => {
    loadTrendingNotes().catch(e => {
      if (e instanceof Error) {
        setError(e);
      }
    });
  }, []);

  if (error) return <ErrorOrOffline error={error} onRetry={loadTrendingNotes} className="p" />;
  if (!posts) return <PageSpinner />;

  // if small, render less stuff
  const options = {
    showFooter: !small,
    showReactionsLink: !small,
    showMedia: !small,
    longFormPreview: !small,
    truncate: small,
    showContextMenu: !small,
  };

  const filteredAndLimitedPosts = () => {
    return posts.filter(a => !isEventMuted(a)).slice(0, count);
  };

  const renderGrid = () => {
    return (
      <div className="grid grid-cols-3 gap-px md:gap-1">
        {filteredAndLimitedPosts().map(e => (
          <ImageGridItem event={e as TaggedNostrEvent} onClick={() => {}} />
        ))}
      </div>
    );
  };

  const renderList = () => {
    return filteredAndLimitedPosts().map(e =>
      small ? (
        <ShortNote event={e as TaggedNostrEvent} />
      ) : (
        <Note data={e as TaggedNostrEvent} related={related?.data ?? []} depth={0} options={options} />
      ),
    );
  };

  return (
    <div className={classNames("flex flex-col", { "gap-6": small, "py-4": small })}>
      {!small && <DisplayAsSelector activeSelection={displayAs} onSelect={a => setDisplayAs(a)} />}
      {displayAs === "grid" ? renderGrid() : renderList()}
    </div>
  );
}
