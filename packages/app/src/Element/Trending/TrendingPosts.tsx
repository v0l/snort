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
import { SpotlightThreadModal } from "@/Element/Spotlight/SpotlightThreadModal";
import useLogin from "@/Hooks/useLogin";

export default function TrendingNotes({ count = Infinity, small = false }) {
  const login = useLogin();
  const displayAsInitial = small ? "list" : login.feedDisplayAs ?? "list";
  // Added count prop with a default value
  const [posts, setPosts] = useState<Array<NostrEvent>>();
  const [error, setError] = useState<Error>();
  const { lang } = useLocale();
  const { isEventMuted } = useModeration();
  const [displayAs, setDisplayAs] = useState<DisplayAs>(displayAsInitial);
  const related = useReactions("trending", posts?.map(a => NostrLink.fromEvent(a)) ?? [], undefined, true);
  const [modalThread, setModalThread] = useState<NostrLink | undefined>(undefined);

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
          <ImageGridItem
            key={e.id}
            event={e as TaggedNostrEvent}
            onClick={() => setModalThread(NostrLink.fromEvent(e))}
          />
        ))}
      </div>
    );
  };

  const renderList = () => {
    return filteredAndLimitedPosts().map(e =>
      small ? (
        <ShortNote key={e.id} event={e as TaggedNostrEvent} />
      ) : (
        <Note key={e.id} data={e as TaggedNostrEvent} related={related?.data ?? []} depth={0} options={options} />
      ),
    );
  };

  return (
    <div className={classNames("flex flex-col", { "gap-6": small, "py-4": small })}>
      {!small && <DisplayAsSelector activeSelection={displayAs} onSelect={a => setDisplayAs(a)} />}
      {displayAs === "grid" ? renderGrid() : renderList()}
      {modalThread && (
        <SpotlightThreadModal
          thread={modalThread}
          onClose={() => setModalThread(undefined)}
          onBack={() => setModalThread(undefined)}
        />
      )}
    </div>
  );
}
