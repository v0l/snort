import { removeUndefined } from "@snort/shared";
import { NostrEvent, NostrLink, TaggedNostrEvent } from "@snort/system";
import classNames from "classnames";
import { useMemo, useState } from "react";

import { ErrorOrOffline } from "@/Components/ErrorOrOffline";
import Note from "@/Components/Event/EventComponent";
import { DisplayAs, DisplayAsSelector } from "@/Components/Feed/DisplayAsSelector";
import ImageGridItem from "@/Components/Feed/ImageGridItem";
import { useLocale } from "@/Components/IntlProvider/useLocale";
import PageSpinner from "@/Components/PageSpinner";
import { SpotlightThreadModal } from "@/Components/Spotlight/SpotlightThreadModal";
import TrendingNote from "@/Components/Trending/ShortNote";
import NostrBandApi from "@/External/NostrBand";
import useCachedFetch from "@/Hooks/useCachedFetch";
import useLogin from "@/Hooks/useLogin";
import useModeration from "@/Hooks/useModeration";
import { System } from "@/system";

export default function TrendingNotes({ count = Infinity, small = false }: { count?: number; small?: boolean }) {
  const api = new NostrBandApi();
  const { lang } = useLocale();
  const trendingNotesUrl = api.trendingNotesUrl(lang);
  const storageKey = `nostr-band-${trendingNotesUrl}`;

  const {
    data: trendingNotesData,
    isLoading,
    error,
  } = useCachedFetch<{ notes: Array<{ event: NostrEvent }> }, Array<NostrEvent>>(trendingNotesUrl, storageKey, data => {
    return removeUndefined(
      data.notes.map(a => {
        const ev = a.event;
        if (!System.optimizer.schnorrVerify(ev)) {
          console.error(`Event with invalid sig\n\n${ev}\n\nfrom ${trendingNotesUrl}`);
          return undefined;
        }
        System.HandleEvent("*", ev as TaggedNostrEvent);
        return ev;
      }),
    );
  });

  const options = useMemo(
    () => ({
      showFooter: !small,
      showReactionsLink: !small,
      showMedia: !small,
      longFormPreview: !small,
      truncate: small,
      showContextMenu: !small,
    }),
    [small],
  );

  const login = useLogin();
  const displayAsInitial = small ? "list" : (login.feedDisplayAs ?? "list");
  const [displayAs, setDisplayAs] = useState<DisplayAs>(displayAsInitial);
  const { isEventMuted } = useModeration();
  const [modalThread, setModalThread] = useState<NostrLink | undefined>(undefined);

  if (error && !trendingNotesData) return <ErrorOrOffline error={error} className="px-3 py-2" />;
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
    return filteredAndLimitedPosts.map((e, index) =>
      small ? (
        <TrendingNote key={e.id} event={e as TaggedNostrEvent} />
      ) : (
        <Note key={e.id} data={e as TaggedNostrEvent} depth={0} options={options} waitUntilInView={index > 5} />
      ),
    );
  };

  return (
    <div className={classNames("flex flex-col", { "gap-4": small, "py-4": small })}>
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
