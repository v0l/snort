import { useState } from "react";
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
import useCachedFetch from "@/Hooks/useCachedFetch";
import { System } from "@/index";
import { removeUndefined } from "@snort/shared";

export default function TrendingNotes({ count = Infinity, small = false }: { count: number, small: boolean }) {
  const api = new NostrBandApi();
  const { lang } = useLocale();
  const trendingNotesUrl = api.trendingNotesUrl(lang);
  const storageKey = `nostr-band-${trendingNotesUrl}`;

  const {
    data: trendingNotesData,
    isLoading,
    error,
  } = useCachedFetch<{ notes: Array<{ event: NostrEvent }> }, Array<NostrEvent>>(trendingNotesUrl, storageKey, data => {
    return removeUndefined(data.notes.map(a => {
      const ev = a.event;
      if (!System.Optimizer.schnorrVerify(ev)) {
        console.error(`Event with invalid sig\n\n${ev}\n\nfrom ${trendingNotesUrl}`);
        return;
      }
      System.HandleEvent(ev as TaggedNostrEvent);
      return ev;
    }));
  });

  const login = useLogin();
  const displayAsInitial = small ? "list" : login.feedDisplayAs ?? "list";
  const [displayAs, setDisplayAs] = useState<DisplayAs>(displayAsInitial);
  const { isEventMuted } = useModeration();
  const related = useReactions("trending", trendingNotesData?.map(a => NostrLink.fromEvent(a)) ?? [], undefined, true);
  const [modalThread, setModalThread] = useState<NostrLink | undefined>(undefined);

  if (error && !trendingNotesData) return <ErrorOrOffline error={error} className="p" />;
  if (isLoading) return <PageSpinner />;

  const filteredAndLimitedPosts = trendingNotesData
    ? trendingNotesData.filter(a => !isEventMuted(a)).slice(0, count)
    : [];

  const renderGrid = () => {
    return (
      <div className="grid grid-cols-3 gap-px md:gap-1">
        {filteredAndLimitedPosts.map(e => (
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
    return filteredAndLimitedPosts.map(e =>
      small ? (
        <ShortNote key={e.id} event={e as TaggedNostrEvent} />
      ) : (
        <Note
          key={e.id}
          data={e as TaggedNostrEvent}
          related={related?.data ?? []}
          depth={0}
          options={{
            showFooter: !small,
            showReactionsLink: !small,
            showMedia: !small,
            longFormPreview: !small,
            truncate: small,
            showContextMenu: !small,
          }}
        />
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
